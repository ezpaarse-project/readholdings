import appLogger from '~/lib/logger/appLogger';

let state: any = {};

export function getState() {
  return state;
}

export function setState(value) {
  state = value;
}

export function end() {
  state.done = true;
  state.endAt = new Date();
  state.took = (new Date(state.endAt) - new Date(state.createdAt)) / 1000;
}

export function fail() {
  state.error = true;
  end();
}

export function addStep(portal, name, fileType) {
  const step = {
    portal,
    name,
    fileType,
    startDate: new Date(),
    endDate: null,
    error: false,
    done: false,
  };
  state.steps.push(step);
  return step;
}

/**
 * Get the latest step in state.
 */
export function getLatestStep() {
  return state.steps[state.steps.length - 1];
}

export function endLatestStep() {
  const step = getLatestStep();
  step.endDate = new Date();
  step.done = true;
}

export function failLatestStep(stack) {
  const step = getLatestStep();
  step.endDate = new Date();
  step.done = true;
  step.error = true;
  step.stack = stack;
  fail();
}

/**
 * Update latest step in state.
 */
export function updateLatestStep(step) {
  state.steps[state.steps.length - 1] = step;
  appLogger.debug('[state]: step is updated');
}

export function createState() {
  appLogger.info('[state]: create new state');
  state = {
    done: false,
    createdAt: new Date(),
    endAt: null,
    took: 0,
    steps: [],
    error: false,
  };
  return state;
}
export function resetState() {
  state = {};
  appLogger.info('[state]: State new state');
}
