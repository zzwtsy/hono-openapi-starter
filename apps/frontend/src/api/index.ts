import { alovaInstance } from "./client";
import { createApis, mountApis } from "./createApis";
import { $$userConfigMap } from "./method-config";

export { alovaInstance } from "./client";
export { $$userConfigMap } from "./method-config";

const Apis = createApis(alovaInstance, $$userConfigMap);

mountApis(Apis);

export default Apis;
