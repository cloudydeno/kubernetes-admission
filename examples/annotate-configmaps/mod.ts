import { AdmissionServer } from "@cloudydeno/kubernetes-admission";
import { toConfigMap } from "@cloudydeno/kubernetes-apis/core/v1";

new AdmissionServer({
  name: 'annotate-configmaps',
  repo: 'https://github.com/cloudydeno/deno-kubernetes_admission',
}).withDefaultWebhookConfig({
  failurePolicy: 'Ignore',
}).withMutatingRule({
  operations: ['CREATE', 'UPDATE'],
  apiGroups: [''],
  apiVersions: ['v1'],
  resources: ['configmaps'],
  scope: 'Namespaced',
  callback(ctx) {
    const configMap = toConfigMap(ctx.request.object);
    const annotationKey = 'cloudydeno.github.io/example';

    const existingVal = configMap.metadata?.annotations?.[annotationKey];
    if (existingVal) {
      ctx.log(`Annotation already found; skipping`);
      return;
    }

    if (!configMap.metadata?.annotations) {
      ctx.addPatch({
        op: 'add',
        path: `/metadata/annotations`,
        value: {},
      });
    }

    ctx.log(`Adding annotation :)`);
    ctx.addPatch({
      op: 'add',
      path: `/metadata/annotations/${annotationKey.replaceAll('/', '~1')}`,
      value: 'mutated',
    });
  },
}).serve();
