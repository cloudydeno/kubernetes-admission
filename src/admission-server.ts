
import { AdmissionHandler } from "./admission-handler.ts";
import { watchFiles } from "./file-watcher.ts";

export class AdmissionServer extends AdmissionHandler {

  async serve(opts: {
    port?: number;
    hostname?: string;
  } = {}): Promise<void> {
    const tlsDirectory = Deno.env.get('WEBHOOK_TLS_DIRECTORY');
    if (tlsDirectory) await this.serveHttps(tlsDirectory, opts);
    else await this.servePlaintext(opts);
  }

  async servePlaintext({
    port = 8000,
    hostname = '[::]',
  } = {}): Promise<void> {
    const srv = Deno.serve({
      port, hostname,
      onError: this.errorResponse,
    }, this.serveRequest.bind(this));
    await srv.finished;
  }

  /** Sets up a TLS server and restarts it when the certificate is updated. */
  async serveHttps(tlsDirectory: string, {
    port = 8443,
    hostname = '[::]',
  } = {}): Promise<void> {
    const certFile = `${tlsDirectory || '.'}/tls.crt`;
    const keyFile = `${tlsDirectory || '.'}/tls.key`;
    for await (const signal of watchFiles([certFile, keyFile])) {
      const srv = Deno.serve({
        port, hostname,
        cert: await Deno.readTextFile(certFile),
        key: await Deno.readTextFile(keyFile),
        signal,
        onError: this.errorResponse,
      }, this.serveRequest.bind(this));
      await srv.finished;
    }
  }

  async serveRequest(request: Request): Promise<Response> {
    const resp = await this.handleRequest(request);
    resp.headers.set("server", `cloudydeno-kubernetes-admission/0.1.0`);
    return resp;
  }

  errorResponse(err: unknown): Response {
    const errMsg = err instanceof Error
      ? (err.stack || err.message)
      : null;
    const msg = errMsg || JSON.stringify(err);

    console.error('!!!', msg);
    return new Response(`Internal Error!\n\n${msg}`, {status: 500});
  }

}
