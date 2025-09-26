import appLogger from '~/lib/logger/appLogger';

type Step = Record<string, unknown> & {
  key: string;
  name: string;
  fileType: string;
  startDate: Date;
  endDate: Date | null;
  status: string;
};

type State = {
  status?: string;
  index?: string;
  createdAt?: Date;
  documents?: number | null;
  endAt?: Date | null;
  took?: number;
  steps?: Step[];
};

let state: State = {};

export function getState() {
  return state;
}

export function setState(value: State) {
  state = value;
}

export function end() {
  if (!state) {
    return;
  }

  state.status = 'done';
  state.endAt = new Date();
  state.took = ((state.endAt?.getTime() ?? 0) - (state.createdAt?.getTime() ?? 0)) / 1000;
}

export function fail() {
  end();
  state.status = 'error';
}

export function addStep(key: string, name: string, fileType: string) {
  const step: Step = {
    key,
    name,
    fileType,
    startDate: new Date(),
    endDate: null,
    status: 'inProgress',
  };
  state.steps?.push(step);
  return step;
}

/**
 * Get the latest step in state.
 */
export function getLatestStep() {
  return state.steps?.at(-1);
}

export function endLatestStep() {
  const step = getLatestStep();
  if (!step) {
    return;
  }
  step.endDate = new Date();
  step.status = 'done';
}

export function failLatestStep(stack: string) {
  const step = getLatestStep();
  if (!step) {
    return;
  }
  step.endDate = new Date();
  step.status = 'error';
  step.stack = stack;
  fail();
}

/**
 * Update latest step in state.
 */
export function updateLatestStep(step: Step) {
  if (!state.steps) {
    return;
  }
  state.steps[state.steps.length - 1] = step;
  appLogger.debug('[state]: step is updated');
}

export function createState(index: string) {
  appLogger.info('[state]: create new state');

  state = {
    status: 'inProgress',
    index,
    createdAt: new Date(),
    documents: 0,
    endAt: null,
    took: 0,
    steps: [],
  };
  return state;
}
export function resetState() {
  state = {};
  appLogger.info('[state]: Reset state');
}
