import { format } from 'date-fns';

import appLogger from '~/lib/logger/appLogger';

let state: any = {};

export function getState() {
  return state;
}

export function setState(value) {
  state = value;
}

export function end() {
  state.status = 'done';
  state.endAt = new Date();
  state.took = (new Date(state.endAt) - new Date(state.createdAt)) / 1000;
}

export function fail() {
  end();
  state.status = 'error';
}

export function addStep(portal, name, fileType) {
  const step = {
    portal,
    name,
    fileType,
    startDate: new Date(),
    endDate: null,
    status: 'inProgress',
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
  step.status = 'done';
}

export function failLatestStep(stack) {
  const step = getLatestStep();
  step.endDate = new Date();
  step.status = 'error';
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
  const date = format(new Date(), 'yyyy-MM-dd');
  const index = `holdings-${date}`;

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
