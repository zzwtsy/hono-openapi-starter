import { beforeEach, describe, expect, it, vi } from "vitest";

import { IAM_ACTIONS, refreshIam } from "./iam-actions";

const { mockAccessAction } = vi.hoisted(() => ({
  mockAccessAction: vi.fn(),
}));

vi.mock("alova/client", () => ({ accessAction: mockAccessAction }));

describe("IAM action delegation", () => {
  beforeEach(() => {
    mockAccessAction.mockReset();
  });

  it("action 名唯一且授权刷新 action 属于 IAM action 集合", () => {
    const actionNames = Object.values(IAM_ACTIONS);

    expect(new Set(actionNames).size).toBe(actionNames.length);
    expect(actionNames).toContain(IAM_ACTIONS.authorization);
  });

  it("逐一刷新已传入的 action，并对未挂载 action 静默处理", () => {
    const firstSend = vi.fn();
    const secondSend = vi.fn();
    const sends = [firstSend, secondSend];
    mockAccessAction.mockImplementation((
      _name: string,
      callback: (actions: { send: () => void }) => void,
    ) => {
      const send = sends.shift();
      if (send !== undefined) {
        callback({ send });
      }
    });

    refreshIam(IAM_ACTIONS.usersList, IAM_ACTIONS.rolesList);

    expect(mockAccessAction).toHaveBeenNthCalledWith(1, IAM_ACTIONS.usersList, expect.any(Function), true);
    expect(mockAccessAction).toHaveBeenNthCalledWith(2, IAM_ACTIONS.rolesList, expect.any(Function), true);
    expect(mockAccessAction).toHaveBeenCalledTimes(2);
    expect(firstSend).toHaveBeenCalledOnce();
    expect(secondSend).toHaveBeenCalledOnce();
  });
});
