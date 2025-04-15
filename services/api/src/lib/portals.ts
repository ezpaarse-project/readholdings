import { getConfig } from './config';

const { portals } = getConfig();

export type Portals = typeof portals;

export type PortalConfig = Portals[keyof Portals];
