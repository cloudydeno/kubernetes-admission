import {
  fromMutatingWebhookConfiguration,
  fromValidatingWebhookConfiguration,
} from "@cloudydeno/kubernetes-apis/admissionregistration.k8s.io/v1";

import {
  fromAdmissionReview, toAdmissionReview,
} from "./admission-review.ts";
import {
  type WebhookRule,
  AdmissionContext,
} from "./admission-context.ts";

export interface DefaultWebhookConfig {
  failurePolicy: 'Ignore' | 'Fail';
  matchPolicy: 'Exact' | 'Equivalent';
  sideEffects: 'Unknown' | 'None' | 'Some' | 'NoneOnDryRun';
  reinvocationPolicy: 'Never' | 'IfNeeded';
  name?: string;
};
const defaultWebhookConfigDefaults: DefaultWebhookConfig = {
  failurePolicy: 'Fail',
  matchPolicy: 'Exact',
  sideEffects: 'None',
  reinvocationPolicy: 'IfNeeded',
};

export class AdmissionHandler {
  constructor(
    public metadata: {
      name: string;
      repo: string;
    },
  ) {}
  mutatingRules: Array<WebhookRule> = [];
  validatingRules: Array<WebhookRule> = [];
  defaultWebhookConfig: Partial<DefaultWebhookConfig> = {};

  withMutatingRule(rule: WebhookRule): this {
    this.mutatingRules.push(rule);
    return this;
  }
  withValidatingRule(rule: WebhookRule): this {
    this.validatingRules.push(rule);
    return this;
  }
  withDefaultWebhookConfig(config: Partial<DefaultWebhookConfig>): this {
    this.defaultWebhookConfig = config;
    return this;
  }

  async handleRequest(request: Request): Promise<Response> {
    const {pathname, origin, hostname} = new URL(request.url);

    if (pathname === "/webhook-config.yaml") {
      return new Response(this.buildConfigManifest(origin, hostname));
    }

    if (pathname === "/healthz") {
      return new Response("ok");
    }
    if (pathname === "/alivez") {
      return new Response("ok");
    }

    if (pathname === '/') return new Response(`<!doctype html>\n<title>${origin}</title>
<p>This is a webhook server specifically for Kubernetes AdmissionReview purposes.\n
<p><code>$ kubectl apply -f "<a href="${origin}/webhook-config.yaml">${origin}/webhook-config.yaml</a>"</code>\n
<p>See also: <a href="${this.metadata.repo}">${this.metadata.repo}</a>`, {
  headers: { 'content-type': 'text/html' },
});

    const isMutate = pathname === '/admission/mutate';
    const isValidate = pathname === '/admission/validate';
    if (!isMutate && !isValidate) return new Response(`Not Found`, { status: 404 });

    if (request.method !== "POST") return new Response(
      "Method Not Allowed. This is a webhook endpoint.",
      { status: 405 });

    if (request.headers.get("content-type") !== 'application/json') return new Response(
      "Please provide 'content-type: application/json' header",
      { status: 400 });

    const review = toAdmissionReview(await request.json());
    if (!review.request?.uid) return new Response(
      "I didn't see a request in your review payload :/",
      { status: 400 });

    const ctx = new AdmissionContext(review.request);

    if (isMutate) {
      await ctx.applyHooks(this.mutatingRules);
      ctx.log(`Generated ${ctx.jsonPatches.length} patches.`);
      for (const patch of ctx.jsonPatches) {
        ctx.log(`- ${JSON.stringify(patch)}`);
      }
    }

    if (isValidate) {
      await ctx.applyHooks(this.validatingRules);
      ctx.log(`Allowed: ${ctx.response.allowed}`);
    }

    const respJson = JSON.stringify(fromAdmissionReview({
      response: ctx.getResponse(),
    }), null, 2);

    return new Response(respJson, {
      headers: {
        "Content-Type": "application/json",
      }});
  }

  buildConfigManifest(origin: string, hostname: string): string {
    const metadata = {
      name: this.metadata.name,
      labels: {
        app: this.metadata.name,
      },
      annotations: {
        repo: this.metadata.repo,
      },
    };
    const baseConfig = {
      admissionReviewVersions: ['v1'],
      name: hostname,
      ...defaultWebhookConfigDefaults,
      ...this.defaultWebhookConfig,
    };

    const blocks = new Array<string>();
    if (this.mutatingRules.length > 0) {
      blocks.push(`---\n`+JSON.stringify(fromMutatingWebhookConfiguration({
        metadata,
        webhooks: [{
          ...baseConfig,
          clientConfig: { url: `${origin}/admission/mutate` },
          rules: this.mutatingRules,
        }],
      }), null, 2)+`\n`);
    }
    if (this.validatingRules.length > 0) {
      const {
        // deno-lint-ignore no-unused-vars
        reinvocationPolicy, // Only relevant for mutating, so pull out + ignore here
        ...validatingConfig
      } = baseConfig;
      blocks.push(`---\n`+JSON.stringify(fromValidatingWebhookConfiguration({
        metadata,
        webhooks: [{
          ...validatingConfig,
          clientConfig: { url: `${origin}/admission/validate` },
          rules: this.validatingRules,
        }],
      }), null, 2)+`\n`);
    }
    return blocks.join('\n\n');
  }

}
