/**
 * 跨 feature 共用的 alova action key。
 *
 * 账户 feature 需要监听 IAM 授权变更,但不能反向依赖 IAM feature;
 * 共享 key 放在 lib,由两侧引用同一个常量。
 */
export const AUTHORIZATION_ACTION = "iam-authorization";
