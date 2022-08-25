import {Command} from '@oclif/core';
import {PreconditionFunction} from '@coveo/cli-commons/lib/preconditions';
import {PreconditionError} from '@coveo/cli-commons/lib/errors/preconditionError';

const thrower = (reason: string) => {
  throw new PreconditionError(`${reason} Precondition Error`);
};

export const mockPreconditions = <
  PreconditionStatus extends Record<string, boolean>
>(
  preconditionStatus: PreconditionStatus
) => {
  type preconditionKeys = keyof PreconditionStatus;
  type preconditionPromises = Record<preconditionKeys, PreconditionFunction>;

  const keys = Object.keys(preconditionStatus);
  const mockedPreconditions = {} as preconditionPromises;

  keys.forEach(
    (key) =>
      (mockedPreconditions[key as preconditionKeys] = (_target: Command) =>
        new Promise<void>((resolve) =>
          preconditionStatus[key] ? resolve() : thrower(key)
        ))
  );

  return mockedPreconditions;
};