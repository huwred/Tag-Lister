import { LitElement, css, html, customElement, property, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_NOTIFICATION_CONTEXT } from '@umbraco-cms/backoffice/notification';
import type { UmbPropertyEditorConfigCollection, UmbPropertyEditorUiElement } from '@umbraco-cms/backoffice/property-editor';
import { UMB_ENTITY_DETAIL_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/workspace';
import { TagListRepository } from './taglist-repository.js';
import type { CmsTag } from '../api/types.js';

/**
 * TagList property editor UI for Umbraco 17.
 *
 * Displays the available tags for a configured group and lets editors
 * multi-select tags to add them to a sibling Tags property on the same node.
 *
 * Configuration:
 *  - tagParent      Alias of the Tags property that receives the selection.
 *  - maxTags        Maximum number of tags shown in the list (default 10).
 *  - groupOverride  Tag group to load. When blank the group is resolved from tagParent.
 */
@customElement('taglist-property-editor-ui')
export default class TagListPropertyEditorUiElement
	extends UmbElementMixin(LitElement)
	implements UmbPropertyEditorUiElement
{
	// The stored value is unused by this editor (it operates as a side-effect picker)
	// but the interface requires it to be declared.
	@property({ attribute: false })
	public value: unknown = undefined;

	@state() private _availableTags: CmsTag[] = [];
	@state() private _selectedIds = new Set<number>();
	@state() private _loading = false;
	@state() private _adding = false;
	@state() private _group = '';
	@state() private _noConfig = false;

	private _groupOverride = '';
	private _tagParent = '';
	private _maxTags = 10;
	private _documentKey?: string;

	private readonly _repo: TagListRepository;
	private _workspaceCtx?: any;

	constructor() {
		super();
		this._repo = new TagListRepository(this);
	}

	override connectedCallback() {
		super.connectedCallback();


		// Resolve the document key and workspace context from the surrounding workspace.
		// This replaces URL parsing and also gives us reload() for refreshing after edits.
		this.consumeContext(UMB_ENTITY_DETAIL_WORKSPACE_CONTEXT, (ctx) => {
			if (!ctx) return;
			this._workspaceCtx = ctx;
			this._documentKey = ctx.getUnique() as string | undefined;
			this._tryResolveGroup();
		});

		// Attempt early group resolution in case the config setter already fired
		// and a groupOverride is configured (no documentKey needed for that path).
		this._tryResolveGroup();
	}

	@property({ attribute: false })
	public set config(config: UmbPropertyEditorConfigCollection) {
		this._groupOverride = (config.getValueByAlias('groupOverride') as string) ?? '';
		this._tagParent = (config.getValueByAlias('tagParent') as string) ?? '';
		this._maxTags = (config.getValueByAlias('maxTags') as number) ?? 10;
		this._noConfig = !this._groupOverride && !this._tagParent;
		this._tryResolveGroup();
	}

	// -----------------------------------------------------------------------
	// Private helpers
	// -----------------------------------------------------------------------

	private _tryResolveGroup() {
		// getContext(UMB_AUTH_CONTEXT) requires the element to be in the DOM.
		// If config fires before connectedCallback, bail here; connectedCallback
		// will call _tryResolveGroup() once connected.
		if (!this.isConnected) return;

		if (this._groupOverride) {
			this._group = this._groupOverride;
			void this._loadTags();
		} else if (this._tagParent && this._documentKey) {
			void this._resolveGroupFromTagParent();
		}
	}

	private async _resolveGroupFromTagParent() {
		if (!this._documentKey || !this._tagParent) return;
		try {
			const group = await this._repo.getGroupForAlias(this._documentKey, this._tagParent);
			if (group) {
				this._group = group;
				await this._loadTags();
			}
		} catch {
			// group stays empty; the template will show the config notice
		}
	}

	private async _loadTags() {
		if (!this._group) return;
		this._loading = true;
		this.requestUpdate();
		try {
			const tags = await this._repo.getTagsInGroup(this._group);
				this._availableTags = tags.slice(0, this._maxTags);
		} finally {
			this._loading = false;
		}
	}

	private _toggleTag(tagId: number) {
		const next = new Set(this._selectedIds);
		if (next.has(tagId)) {
			next.delete(tagId);
		} else {
			next.add(tagId);
		}
		this._selectedIds = next;
	}

	private async _addToList() {
		if (!this._documentKey || !this._tagParent || this._selectedIds.size === 0) return;

		const selectedTags = this._availableTags
			.filter((t) => this._selectedIds.has(t.id))
			.map((t) => t.tag);
		
		if (selectedTags.length === 0) return;

		this._adding = true;
		this.requestUpdate();
		try {
			const ok = await this._repo.addTagsToContent(
				this._documentKey,
				this._tagParent,
				this._group,
				selectedTags,
			);

			if (ok) {

					const notificationContext = await this.getContext(UMB_NOTIFICATION_CONTEXT);
					if (notificationContext) {
						notificationContext.peek('positive', {
							data: {
								headline: 'Tags added',
								message: `${selectedTags.length} tag(s) added to content.`,
							},
						});
					}
					this._selectedIds = new Set();
					// Reload the workspace so the Tags property reflects the new values.
					await this._workspaceCtx?.reload();
					// Refresh the tag counts shown in this list.
					await this._loadTags();
			} else {
				const notificationContext = await this.getContext(UMB_NOTIFICATION_CONTEXT);
				if (notificationContext) {
					notificationContext.peek('danger', {
						data: {
							headline: 'Error',
							message: 'Failed to add tags to the content node.',
						},
					});
				}

			}
		} catch (error) {
			console.log("Error!" ,error);
		} finally {
			this._adding = false;
		}
	}

	// -----------------------------------------------------------------------
	// Render
	// -----------------------------------------------------------------------

	override render() {
		if (this._noConfig) {
			return html`<p class="notice">

				Configure the <em>Tag Control</em> alias or <em>Group Override</em> in the Data Type settings.
			</p>`;
		}

		if (this._loading) {
			return html`<uui-load-indicator></uui-load-indicator>`;
		}

		if (!this._group) {
			return html`<p class="notice">Resolving tag group&hellip;</p>`;
		}

		return html`
			<div class="tl-editor">
				${this._availableTags.length === 0
					? html`<p class="notice">No tags found in group &ldquo;${this._group}&rdquo;.</p>`
					: html`
							${this._availableTags.map(
								(tag) => html`<uui-tag look="outline">
									<uui-checkbox
										label="(${tag.noTaggedNodes ?? 0})&nbsp;${tag.tag}"
										?checked=${this._selectedIds.has(tag.id)}
										@change=${() => this._toggleTag(tag.id)}
									></uui-checkbox></uui-tag>
								`,
							)}
					`}

				${this._tagParent
					? html`
							<div class="break"></div><div class="tl-actions">
								<uui-button
									label="Add to ${this._tagParent}"
									look="secondary"
									?disabled=${this._selectedIds.size === 0 || this._adding || !this._documentKey}
									@click=${this._addToList}
								>
									${this._adding ? html`<uui-load-indicator></uui-load-indicator>` : `Add to ${this._tagParent}`}
								</uui-button>
								${this._selectedIds.size > 0
									? html`<span class="tl-sel">${this._selectedIds.size} selected</span>`
									: ''}
							</div>
					  `
					: ''}
			</div>
		`;
	}

	static styles = css`
		:host {
			display: block;
		}

		.tl-editor {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			gap: var(--uui-size-space-3, 12px);
			width: 98%; 
			border: 1px solid var(--uui-color-border,#d8d7d9);
			border-radius: var(--uui-border-radius,3px);
			padding: 8px;  overflow: auto;
		}
		uui-checkbox .label {

			white-space:nowrap;
		}

		.break {
		  flex-basis: 100%;
		  height: 0; /* no visible height */
		}
		.tl-actions {
			display: flex;
			align-items: center;
			gap: var(--uui-size-space-4, 18px);
		}

		.tl-sel {
			font-size: 0.85em;
			color: var(--uui-color-text-alt, #6b6b6b);
		}

		.notice {
			color: var(--uui-color-text-alt, #6b6b6b);
			font-style: italic;
			margin: 0;
		}
	`;
}

declare global {
	interface HTMLElementTagNameMap {
		'taglist-property-editor-ui': TagListPropertyEditorUiElement;
	}
}
