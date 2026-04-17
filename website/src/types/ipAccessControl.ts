/**
 * IP Access Control Types
 * @crossref:used-in[useIpAccessControl, IpAccessControl, ipAccessMiddleware]
 */

/** Type of IP entry - whitelist allows, blacklist blocks */
export type IpEntryType = 'whitelist' | 'blacklist';

/** Access control mode for the system */
export type IpAccessMode = 'allow_all' | 'block_all' | 'whitelist_only' | 'blacklist_block';

/** Single IP entry in the access control list */
export interface IpEntry {
  readonly id: string;
  readonly ipAddress: string;
  readonly type: IpEntryType;
  readonly description: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly createdBy: string;
}

/** Complete IP access control settings */
export interface IpAccessSettings {
  readonly mode: IpAccessMode;
  readonly entries: readonly IpEntry[];
  readonly lastUpdated: string;
}

/** Validation result for IP address */
export interface IpValidationResult {
  readonly valid: boolean;
  readonly error?: string;
  readonly normalized?: string;
}

/** Statistics for IP access control */
export interface IpAccessStats {
  readonly totalEntries: number;
  readonly whitelistCount: number;
  readonly blacklistCount: number;
  readonly activeCount: number;
  readonly inactiveCount: number;
}

/** Result of an access check */
export interface IpAccessCheckResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly matchedEntry?: IpEntry;
}

/** Input for adding a new IP entry */
export interface AddIpEntryInput {
  readonly ipAddress: string;
  readonly type: IpEntryType;
  readonly description: string;
}

/** Input for updating an IP entry */
export interface UpdateIpEntryInput {
  readonly description?: string;
  readonly type?: IpEntryType;
  readonly isActive?: boolean;
}
