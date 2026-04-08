import type { CmsTag } from '../api/types.js';
import { UmbControllerBase } from '@umbraco-cms/backoffice/class-api';
import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { client } from '../api/client.gen.js';

const BEARER = [{ scheme: 'bearer', type: 'http' }] as const;
const API_BASE = '/umbraco/ourcommunitytagspopular/api/v1';

export class TagListRepository extends UmbControllerBase {
	constructor(host: UmbControllerHost) {
		super(host);
	}

	async getTagsInGroup(groupName: string): Promise<CmsTag[]> {
		try {
			const { data } = await client.get({
				security: BEARER,
				url: `${API_BASE}/tagsingroup/${encodeURIComponent(groupName)}`,
			});
			return (data as CmsTag[]) ?? [];
		} catch {
			return [];
		}
	}

	async getTags(groupName: string): Promise<CmsTag[]> {
		return this.getTagsInGroup(groupName);
	}

	async moveTagToGroup(tagId: number, targetGroup: string): Promise<boolean> {
		try {
			const { response } = await client.post({
				security: BEARER,
				url: `${API_BASE}/movetag`,
				body: { tagId, targetGroup },
			});
			return response.ok;
		} catch {
			return false;
		}
	}

	async copyTagToGroup(tagId: number, targetGroup: string): Promise<{ ok: boolean; conflict: boolean }> {
		try {
			const { response } = await client.post({
				security: BEARER,
				url: `${API_BASE}/copytag`,
				body: { tagId, targetGroup },
			});
			return { ok: response.ok, conflict: response.status === 409 };
		} catch {
			return { ok: false, conflict: false };
		}
	}

	/// Returns the tag group configured on a sibling Tags property by its alias.
	async getGroupForAlias(contentKey: string, propertyAlias: string): Promise<string | null> {
		try {
			const { data } = await client.get({
				security: BEARER,
				url: `${API_BASE}/groupforalias`,
				query: { contentKey, propertyAlias },
			});
			return (data as { group?: string })?.group ?? null;
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
			const { response } = await client.post({
				security: BEARER,
				url: `${API_BASE}/addtagstocontent`,
				body: { contentKey, tagPropertyAlias, group, tags },
			});
			return response.ok;
		} catch {
			return false;
		}
	}
}