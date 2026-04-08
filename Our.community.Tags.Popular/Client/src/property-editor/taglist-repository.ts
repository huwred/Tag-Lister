import type { CmsTag } from '../api/types.js';
import { UmbControllerBase } from '@umbraco-cms/backoffice/class-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';

const API_BASE = '/umbraco/ourcommunitytagspopular/api/v1';

export class TagListRepository extends UmbControllerBase {
	constructor(host: UmbControllerHost) {
		super(host);
	}

	// Cache the promise so getContext is only called once per repository instance.
	// A second call to getContext(UMB_AUTH_CONTEXT) on the same host hangs permanently.
	private _authContextPromise: Promise<any> | null = null;

	private async getAuthHeaders(): Promise<HeadersInit> {
		try {
			if (!this._authContextPromise) {
				this._authContextPromise = this.getContext(UMB_AUTH_CONTEXT);
			}
			const authContext = await this._authContextPromise;
			const token = await authContext?.getLatestToken();
			return {
				'Content-Type': 'application/json',
				...(token ? { 'Authorization': `Bearer ${token}` } : {}),
			};
		} catch (error) {
			this._authContextPromise = null;
			return { 'Content-Type': 'application/json' };
		}
	}

	async getTagsInGroup(groupName: string): Promise<CmsTag[]> {
		try {
			const headers = await this.getAuthHeaders();
			const response = await fetch(`${API_BASE}/tagsingroup/${encodeURIComponent(groupName)}`, {
				headers,
				credentials: 'include',
			});
			if (!response.ok) return [];
			return await response.json();
		} catch {
			return [];
		}
	}

	async getTags(groupName: string): Promise<CmsTag[]> {
		return this.getTagsInGroup(groupName);
	}


	async moveTagToGroup(tagId: number, targetGroup: string): Promise<boolean> {
		try {
			const headers = await this.getAuthHeaders();
			const response = await fetch(`${API_BASE}/movetag`, {
				method: 'POST',
				headers,
				body: JSON.stringify({ tagId, targetGroup }),
				credentials: 'include',
			});
			return response.ok;
		} catch {
			return false;
		}
	}

	async copyTagToGroup(tagId: number, targetGroup: string): Promise<{ ok: boolean; conflict: boolean }> {
		try {
			const headers = await this.getAuthHeaders();
			const response = await fetch(`${API_BASE}/copytag`, {
				method: 'POST',
				headers,
				body: JSON.stringify({ tagId, targetGroup }),
				credentials: 'include',
			});
			return { ok: response.ok, conflict: response.status === 409 };
		} catch {
			return { ok: false, conflict: false };
		}
	}

	/// Returns the tag group configured on a sibling Tags property by its alias.
	async getGroupForAlias(contentKey: string, propertyAlias: string): Promise<string | null> {
		try {
			const headers = await this.getAuthHeaders();
			const response = await fetch(
				`${API_BASE}/groupforalias?contentKey=${encodeURIComponent(contentKey)}&propertyAlias=${encodeURIComponent(propertyAlias)}`,
				{ headers, credentials: 'include' },
			);
			if (!response.ok) return null;
			const data = await response.json();
			return (data?.group as string) ?? null;
		} catch {
			return null;
		}
	}

	/// Adds the given tag texts to a content/media node's Tags property and saves the node.
	async addTagsToContent(
		contentKey: string,
		tagPropertyAlias: string,
		group: string,
		tags: string[],
	): Promise<boolean> {
		try {
			const headers = await this.getAuthHeaders();
			const response = await fetch(`${API_BASE}/addtagstocontent`, {
				method: 'POST',
				headers,
				body: JSON.stringify({ contentKey, tagPropertyAlias, group, tags }),
				credentials: 'include',
			});
			return response.ok;
		} catch {
			return false;
		}
	}
}