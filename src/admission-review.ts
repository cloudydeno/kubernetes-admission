import {
  type UserInfo, fromUserInfo, toUserInfo,
} from "@cloudydeno/kubernetes-apis/authentication.k8s.io/v1";
import {
  type Status, fromStatus, toStatus,
} from "@cloudydeno/kubernetes-apis/meta/v1";
import * as c from "@cloudydeno/kubernetes-apis/common.ts";

import {
  decodeBase64,
  encodeBase64,
} from "@std/encoding/base64";

// https://github.com/kubernetes/api/blob/master/admission/v1beta1/types.go
// This file looks like a normal /x/kubernetes_apis file, but it's actually handwritten
// Because AdmissionReview is never served by APIServer, the OpenAPI file completely excludes it


/** AdmissionReview is the primary payload that gets transfered in both directions */
export interface AdmissionReview {
  apiVersion?: "admission.k8s.io/v1";
  kind?: "AdmissionReview";
  request?: AdmissionRequest | null;
  response?: AdmissionResponse | null;
}
export function toAdmissionReview(input: c.JSONValue): AdmissionReview & c.ApiKind {
  const obj = c.checkObj(input);
  return {
    ...c.assertOrAddApiVersionAndKind(obj, "admission.k8s.io/v1", "AdmissionReview"),
    request: c.readOpt(obj["request"], x => toAdmissionRequest(x)),
    response: c.readOpt(obj["response"], toAdmissionResponse),
  }}
export function fromAdmissionReview(input: AdmissionReview): c.JSONValue {
  return {
    ...c.assertOrAddApiVersionAndKind(input, "admission.k8s.io/v1", "AdmissionReview"),
    ...input,
    request: input.request != null ? fromAdmissionRequest(input.request) : undefined,
    response: input.response != null ? fromAdmissionResponse(input.response) : undefined,
  }}


export interface AdmissionRequest {
  uid: string;
  kind: GroupVersionKind;
  resource: GroupVersionResource;
  subResource?: string | null;
  requestKind?: GroupVersionKind | null;
  requestResource?: GroupVersionResource | null;
  requestSubResource?: string | null;
  name?: string | null;
  namespace?: string | null;
  operation: "CREATE" | "UPDATE" | "DELETE" | "CONNECT" | c.UnexpectedEnumValue;
  userInfo: UserInfo;
  object: c.JSONValue;
  oldObject: c.JSONValue;
  dryRun?: boolean | null;
  options?: unknown; // CreateOptions, etc
}
export function toAdmissionRequest(input: c.JSONValue): AdmissionRequest {
  const obj = c.checkObj(input);
  return {
    uid: c.checkStr(obj["uid"]),
    kind: toGroupVersionKind(c.checkObj(obj["kind"])),
    resource: toGroupVersionResource(c.checkObj(obj["resource"])),
    subResource: c.readOpt(obj["subResource"], c.checkStr),
    requestKind: c.readOpt(obj["requestKind"], x => toGroupVersionKind(c.checkObj(x))),
    requestResource: c.readOpt(obj["requestResource"], x => toGroupVersionResource(c.checkObj(x))),
    requestSubResource: c.readOpt(obj["requestSubResource"], c.checkStr),
    name: c.readOpt(obj["name"], c.checkStr),
    namespace: c.readOpt(obj["namespace"], c.checkStr),
    operation: c.readEnum(obj["operation"]),
    userInfo: toUserInfo(c.checkObj(obj["userInfo"])),
    object: obj["object"],
    oldObject: obj["oldObject"],
    dryRun: c.readOpt(obj["dryRun"], c.checkBool),
    options: obj["options"],
  }}
export function fromAdmissionRequest(input: AdmissionRequest): c.JSONValue {
  return {
    ...input,
    kind: {...input.kind},
    resource: {...input.resource},
    requestKind: input.requestKind != null ? {...input.requestKind} : undefined,
    requestResource: input.requestResource != null ? {...input.requestResource} : undefined,
    userInfo: fromUserInfo(input.userInfo),
    options: input.options as c.JSONValue,
  }}


export interface AdmissionResponse {
  uid: string;
  allowed: boolean;
  result?: Status | null;
  patch?: Uint8Array | null; // base64 encoded
  patchType?: 'JSONPatch' | c.UnexpectedEnumValue | null;
  auditAnnotations?: Record<string, string> | null;
  warnings?: Array<string> | null;
}
export function toAdmissionResponse(input: c.JSONValue): AdmissionResponse {
  const obj = c.checkObj(input);
  return {
    uid: c.checkStr(obj["uid"]),
    allowed: c.checkBool(obj["allowed"]),
    result: c.readOpt(obj["status"], toStatus),
    patch: c.readOpt(obj["patch"], x => decodeBase64(c.checkStr(x))),
    patchType: c.readOpt(obj["patchType"], x => c.readEnum<c.UnexpectedEnumValue>(x)),
    auditAnnotations: c.readOpt(obj["auditAnnotations"], x => c.readMap(x, c.checkStr)),
    warnings: c.readOpt(obj["warnings"], x => c.readList(x, c.checkStr)),
  }}
export function fromAdmissionResponse(input: AdmissionResponse): c.JSONValue {
  return {
    ...input,
    result: input.result != null ? fromStatus(input.result) : undefined,
    patch: input.patch != null ? encodeBase64(input.patch) : undefined,
  }}


export interface GroupVersionKind {
  group:   string;
  version: string;
  kind:    string;
}
export function toGroupVersionKind(input: c.JSONValue): GroupVersionKind {
  const obj = c.checkObj(input);
  return {
    group: c.checkStr(obj["group"]),
    version: c.checkStr(obj["version"]),
    kind: c.checkStr(obj["kind"]),
  }}

export interface GroupVersionResource {
  group:    string;
  version:  string;
  resource: string;
}
export function toGroupVersionResource(input: c.JSONValue): GroupVersionResource {
  const obj = c.checkObj(input);
  return {
    group: c.checkStr(obj["group"]),
    version: c.checkStr(obj["version"]),
    resource: c.checkStr(obj["resource"]),
  }}
