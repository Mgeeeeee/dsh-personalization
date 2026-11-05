window.__ModuleLoader__.load({
	id: 'dsh-ui-personalization',
	factory(require) {
		const React = require('react');
		const h = React.createElement;

		/** Dictionary namespace owned by this plugin. */
		const NS = 'ui-personalization';
		/** Settings section id; it is the nav cell's cell key in the section ledger. */
		const SECTION_ID = 'ui-personalization';
		/** localStorage key holding the whole plugin state. */
		const STORAGE_KEY = 'dsh.personalization.v1';
		/** Key this plugin used before the rename; read once so saved identity survives. */
		const LEGACY_STORAGE_KEY = 'dsh.profile-identity.v1';
		/**
		 * This plugin's own version, shown in the page footnote. The client half
		 * receives no package metadata, so the value is kept here by hand — the
		 * structure check and scripts/publish.sh both refuse a release when it
		 * drifts from package.json.
		 */
		const PLUGIN_VERSION = '0.1.6';
		/** Dedupe tag for this plugin's stylesheet. */
		const CSS_TAG = 'dsh-ui-personalization/client.css';
		/** Safety-net re-read while the page stays visible; the account stream drives the rest. */
		const BALANCE_REFRESH_MS = 180000;
		/** How long to wait for the account Remote before calling it unavailable. */
		const BALANCE_READY_TIMEOUT_MS = 10000;
		/**
		 * Collapses the shell's brand row while the hide switch is on. The row's height
		 * is the shell's own (60px, not tokenized), so emptying the two brand slots
		 * leaves a gap; this is the one rule in this plugin that reaches outside its
		 * own components. It matches the shell's CSS-module local name by substring and
		 * refuses rows that hold a button — on Windows the collapse control lives in
		 * that row. A shell rename drops the rule, which only restores the gap.
		 */
		const BRAND_COLLAPSE_CSS = '[class*="_logoRow"]:not(:has(button)){height:0;min-height:0;margin:0;padding:0;overflow:hidden}';
		const BRAND_COLLAPSE_TAG = 'dsh-ui-personalization/brand-collapse.css';

		/**
		 * The client build version the account Remote reports as `x-client-version`.
		 * The shell inlines its own release version into each client bundle at build
		 * time; the boot manifest publishes that same release, and is its only
		 * runtime copy. When a host publishes no release the balance stays hidden
		 * rather than sending a stale version this plugin cannot verify.
		 * @returns the version, or null when the page carries none.
		 */
		function readClientVersion() {
			const version = globalThis.__DSH_BOOT__?.release?.version;
			return typeof version === 'string' && version !== '' ? version : null;
		}

		const en = {
			'launcher.label': 'Personalization',
			'unnamed': 'Me',
			'nav': 'Personalization',
			'balance.title': 'Balance (granted credit included)',
			'page.footnote': 'This page is provided by dsh-ui-personalization',
			'field.avatar': 'Avatar',
			'field.avatar.desc': 'Kept in this browser only',
			'field.nickname': 'Nickname',
			'field.nickname.placeholder': 'Your name',
			'field.enable': 'Custom identity',
			'field.enable.desc': 'Off restores the built-in account row and its menu.',
			'field.hideBrand': 'Hide the top brand mark',
			'action.upload': 'Choose image',
			'action.reset': 'Reset image',
			'avatar.failed': 'Could not read that image — try another one.'
		};
		const zh = {
			'launcher.label': '个性化',
			'unnamed': '我',
			'nav': '个性化',
			'balance.title': '余额（含赠金）',
			'page.footnote': '本页由 dsh-ui-personalization 插件提供',
			'field.avatar': '头像',
			'field.avatar.desc': '只保存在当前浏览器',
			'field.nickname': '昵称',
			'field.nickname.placeholder': '输入昵称',
			'field.enable': '自定义身份',
			'field.enable.desc': '关闭后恢复系统自带的账号行与其菜单。',
			'field.hideBrand': '隐藏顶部品牌标识',
			'action.upload': '选择图片',
			'action.reset': '恢复默认',
			'avatar.failed': '这张图读不出来，换一张试试。'
		};

		/* The launcher and the controls copy the shipped markup for the same seats;
		 * the section stack copies the shipped account section. Every declaration
		 * below is a --dsw-* token, renamed under this plugin's prefix. */
		const CSS = '.dshprf_root{flex:1;min-width:0}.dshprf_trigger{user-select:none;border-radius:var(--dsw-radius-md);width:100%;height:44px;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;align-items:center;gap:8px;padding:6px;font-size:14px;display:flex}.dshprf_trigger[data-collapsed=true]{box-sizing:border-box;justify-content:center;gap:0;width:36px;height:36px;padding:0}.dshprf_trigger:hover{background:var(--dsw-alias-interactive-bg-hover)}.dshprf_trigger:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}.dshprf_avatar{corner-shape:round;background:var(--dsw-alias-bg-skeleton);width:24px;height:24px;color:var(--dsw-alias-label-tertiary);border-radius:50%;flex:none;justify-content:center;align-items:center;display:flex;overflow:hidden}.dshprf_label{flex:1;min-width:0;text-align:left;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.dshprf_balance{flex:none;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;font-variant-numeric:tabular-nums;white-space:nowrap}.dshprf_image{corner-shape:round;width:100%;height:100%;border-radius:50%;object-fit:cover;display:block}.dshprf_initial{corner-shape:round;width:100%;height:100%;border-radius:50%;color:#fff;font-size:12px;justify-content:center;align-items:center;display:flex}.dshprf_section{color:var(--dsw-alias-label-primary);flex-direction:column;gap:16px;padding:8px 0;font-size:13px;line-height:22px;display:flex}.dshprf_card{border:.5px solid var(--dsw-alias-settings-card-stroke);border-radius:var(--dsw-radius-xl);background:var(--dsw-alias-settings-card-fill);padding:2px 16px}.dshprf_field{box-sizing:border-box;justify-content:space-between;align-items:center;gap:16px;min-height:56px;padding:12px 0;display:flex}.dshprf_field+.dshprf_field{border-top:.5px solid var(--dsw-alias-border-l2)}.dshprf_fieldText{flex-direction:column;gap:4px;min-width:0;display:flex}.dshprf_fieldTitle{color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}.dshprf_fieldDesc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.dshprf_fieldControl{flex:none;align-items:center;gap:8px;display:flex}.dshprf_preview{width:56px;height:56px;flex:none}.dshprf_preview .dshprf_initial{font-size:22px}.dshprf_input{box-sizing:border-box;width:200px;height:36px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font:inherit;padding:0 10px;font-size:14px;line-height:22px}.dshprf_input:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}.dshprf_button{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);white-space:nowrap;height:36px;color:var(--dsw-alias-label-primary);background:0 0;justify-content:center;align-items:center;padding:0 14px;font:inherit;font-size:14px;line-height:22px;cursor:pointer;display:inline-flex}.dshprf_button:hover{background:var(--dsw-alias-interactive-bg-hover)}.dshprf_button:disabled{color:var(--dsw-alias-label-tertiary);cursor:default;background:0 0}.dshprf_button:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}.dshprf_switch{box-sizing:border-box;width:36px;height:20px;border:0;border-radius:999px;corner-shape:round;background:var(--dsw-alias-border-l3);cursor:pointer;flex:none;align-items:center;padding:2px;display:inline-flex}.dshprf_switch[aria-checked=true]{background:var(--dsw-alias-brand-primary)}.dshprf_switch:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}.dshprf_knob{corner-shape:round;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-switch-thumb);transition:transform 120ms ease}.dshprf_switch[aria-checked=true] .dshprf_knob{background:var(--dsw-alias-label-primary-foreground);transform:translateX(16px)}.dshprf_footnote{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;margin:0;text-align:center}.dshprf_pick{position:relative;flex:none}.dshprf_pickBtn{position:relative;box-sizing:border-box;border:0;padding:0;cursor:pointer;font:inherit}.dshprf_pickBtn:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}.dshprf_remove{corner-shape:round;position:absolute;top:-4px;right:-4px;width:22px;height:22px;border:0;padding:0;border-radius:50%;background:#000000b3;color:#fff;box-shadow:0 0 0 2px var(--dsw-alias-settings-card-fill);justify-content:center;align-items:center;display:flex;opacity:0;pointer-events:none;cursor:pointer;transition:opacity 120ms ease}.dshprf_remove:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}.dshprf_scrim{position:absolute;inset:0;border-radius:inherit;corner-shape:inherit;background:#00000073;color:#fff;justify-content:center;align-items:center;display:flex;opacity:0;transition:opacity 120ms ease}.dshprf_pick:hover .dshprf_scrim,.dshprf_pick:focus-within .dshprf_scrim,.dshprf_pick:hover .dshprf_remove,.dshprf_pick:focus-within .dshprf_remove{opacity:1}.dshprf_pick:hover .dshprf_remove,.dshprf_pick:focus-within .dshprf_remove{pointer-events:auto}.dshprf_fieldError{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}@media (hover:none){.dshprf_remove{opacity:1;pointer-events:auto}}@media (prefers-reduced-motion:reduce){.dshprf_scrim,.dshprf_remove{transition:none}}';

		/** Small observable used by the React surfaces below. */
		function createSource(initial) {
			let value = initial;
			const listeners = /* @__PURE__ */ new Set();
			return {
				getSnapshot: () => value,
				subscribe(listener) {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				set(next) {
					if (next === value) return;
					value = next;
					for (const listener of [...listeners]) listener();
				}
			};
		}

		/** Normalize whatever localStorage held into the state this plugin renders. */
		function readState() {
			try {
				const raw = globalThis.localStorage?.getItem(STORAGE_KEY) ?? globalThis.localStorage?.getItem(LEGACY_STORAGE_KEY);
				if (raw !== null && raw !== undefined) {
					const value = JSON.parse(raw);
					if (value !== null && typeof value === 'object') return {
						enabled: value.enabled !== false,
						nickname: typeof value.nickname === 'string' ? value.nickname : '',
						avatar: typeof value.avatar === 'string' ? value.avatar : null,
						hideBrand: value.hideBrand === true
					};
				}
			} catch (_error) {
				/* Unavailable or corrupt storage falls back to the defaults. */
			}
			return {
				enabled: true,
				nickname: '',
				avatar: null,
				hideBrand: false
			};
		}

		const profileState = createSource(readState());
		const store = {
			getSnapshot: profileState.getSnapshot,
			subscribe: profileState.subscribe,
			update(patch) {
				const next = {
					...profileState.getSnapshot(),
					...patch
				};
				profileState.set(next);
				try {
					globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next));
				} catch (_error) {
					/* A full or blocked storage keeps the change for this session only. */
				}
			}
		};

		/**
		 * Balance read state: `loading`, `ready`, `signed-out`, `failed`, or
		 * `unavailable` when this deployment never offers the account Remote.
		 */
		const balance = createSource({
			status: 'loading',
			text: null
		});
		/** Replaced once the account Remote is available. */
		let loadBalance = () => {};
		const bridge = { refreshBalance: () => loadBalance() };

		function useSource(source) {
			return React.useSyncExternalStore(source.subscribe, source.getSnapshot);
		}

		/** Stable hue per name so an uploaded image can be replaced by a recognizable letter. */
		function hueOf(text) {
			let hash = 0;
			for (const character of text) hash = (hash * 31 + character.codePointAt(0)) % 360;
			return hash;
		}

		/** First visible character of a name, uppercased. */
		function initialOf(text) {
			const trimmed = text.trim();
			return trimmed === '' ? '' : Array.from(trimmed)[0].toUpperCase();
		}

		/** The uploaded image, or a letter tile derived from the nickname. */
		function Avatar({ profile, t, className }) {
			if (profile.avatar !== null) return h('img', {
				className,
				src: profile.avatar,
				alt: '',
				draggable: false
			});
			const name = profile.nickname.trim() === '' ? t('unnamed') : profile.nickname.trim();
			return h('span', {
				className,
				style: { background: `hsl(${hueOf(name)}, 42%, 52%)` },
				'aria-hidden': true
			}, initialOf(name));
		}

		/** Shrink a picked image to a 128px square data URL so it fits in localStorage. */
		function toAvatarDataUrl(file, done) {
			const url = URL.createObjectURL(file);
			const image = new Image();
			const finish = (value) => {
				URL.revokeObjectURL(url);
				done(value);
			};
			image.onload = () => {
				try {
					const size = 128;
					const canvas = document.createElement('canvas');
					canvas.width = size;
					canvas.height = size;
					const context = canvas.getContext('2d');
					const scale = Math.max(size / image.width, size / image.height);
					const width = image.width * scale;
					const height = image.height * scale;
					context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
					finish(canvas.toDataURL('image/png'));
				} catch (_error) {
					finish(null);
				}
			};
			image.onerror = () => finish(null);
			image.src = url;
		}

		/**
		 * Truncate one decimal balance string toward zero into cents.
		 * @param text - validated decimal amount.
		 * @returns the cent value plus whether digits were dropped, or null when unparsable.
		 */
		function parseCents(text) {
			const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(String(text).trim());
			if (match === null || (match[2] === '' && (match[3] ?? '') === '')) return null;
			const sign = match[1] === '-' ? -1 : 1;
			const whole = Number(match[2] === '' ? '0' : match[2]);
			const fraction = match[3] ?? '';
			const kept = Number(`${fraction}00`.slice(0, 2));
			return {
				cents: sign * (whole * 100 + kept),
				subCent: /[1-9]/.test(fraction.slice(2))
			};
		}

		/**
		 * Sum the topped-up and granted wallets of one currency into display text,
		 * following the shipped account page's two-decimal and sub-cent rules.
		 * @param value - the Remote's balance value.
		 * @returns currency text, or null when no wallet is readable.
		 */
		function formatBalance(value) {
			if (value === null || value === void 0 || value.status !== 'ready') return null;
			const wallets = [...value.value, ...value.bonusWallets];
			if (wallets.length === 0) return null;
			const currency = wallets[0].currency === 'USD' ? 'USD' : 'CNY';
			let cents = 0;
			let subCent = false;
			let seen = false;
			for (const wallet of wallets) {
				if (wallet.currency !== currency) continue;
				const parsed = parseCents(wallet.balance);
				if (parsed === null) continue;
				seen = true;
				cents += parsed.cents;
				subCent = subCent || parsed.subCent;
			}
			if (!seen) return null;
			const symbol = currency === 'CNY' ? '¥' : '$';
			const absolute = Math.abs(cents);
			if (absolute === 0) return subCent ? `<${symbol}0.01` : `${symbol}0.00`;
			const text = `${Math.floor(absolute / 100).toLocaleString()}.${String(absolute % 100).padStart(2, '0')}`;
			return `${cents < 0 ? '-' : ''}${symbol}${text}`;
		}

		/** Sidebar-foot identity row; clicking it opens the shell's settings panel. */
		function IdentityLauncher({ wide, openSettings, settingsOpen, refreshBalance, t }) {
			const profile = useSource(store);
			const status = useSource(balance);
			const wasOpen = React.useRef(false);
			React.useEffect(() => {
				if (settingsOpen && !wasOpen.current) refreshBalance();
				wasOpen.current = settingsOpen;
			});
			const name = profile.nickname.trim() === '' ? t('unnamed') : profile.nickname.trim();
			return h('div', { className: 'dshprf_root' }, h('button', {
				type: 'button',
				className: 'dshprf_trigger',
				'data-collapsed': !wide,
				'aria-label': t('launcher.label'),
				title: name,
				onClick: () => openSettings()
			}, h('span', { className: 'dshprf_avatar' }, h(Avatar, {
				profile,
				t,
				className: profile.avatar === null ? 'dshprf_initial' : 'dshprf_image'
			})), wide ? h('span', { className: 'dshprf_label' }, name) : null, wide && status.status === 'ready' && status.text !== null ? h('span', {
				className: 'dshprf_balance',
				title: t('balance.title')
			}, status.text) : null));
		}

		/** One switch control, shared by every toggle on the page. */
		function Switch({ checked, label, onChange }) {
			return h('button', {
				type: 'button',
				className: 'dshprf_switch',
				role: 'switch',
				'aria-checked': checked,
				'aria-label': label,
				title: label,
				onClick: onChange
			}, h('span', { className: 'dshprf_knob' }));
		}

		/** One titled switch row: label — and, when it has one, description — on the
		 * left, the switch on the right. */
		function SwitchRow({ t, titleKey, descKey, checked, onToggle }) {
			return h('div', { className: 'dshprf_field' }, h('div', { className: 'dshprf_fieldText' }, h('div', {
				className: 'dshprf_fieldTitle'
			}, t(titleKey)), descKey ? h('div', { className: 'dshprf_fieldDesc' }, t(descKey)) : null), h('div', {
				className: 'dshprf_fieldControl'
			}, h(Switch, {
				checked,
				label: t(titleKey),
				onChange: onToggle
			})));
		}

		/**
		 * Shadow one shipped brand slot while the hide switch is on. Our entry is the
		 * live one, so the slot's own fallback stays out of the way; disposing the
		 * registration hands the seat straight back.
		 * @param ctx - plugin context.
		 * @param slotName - `sidebar.brand.mark` or `sidebar.brand.name`.
		 * @returns the injection disposer.
		 */
		function registerBrandHider(ctx, slotName) {
			return ctx.slots.inject(slotName, () => {
				let dispose;
				const sync = () => {
					const hidden = store.getSnapshot().hideBrand;
					if (hidden && dispose === void 0) {
						try {
							dispose = ctx.slots.register({
								name: slotName,
								priority: -1,
								registrant: 'dsh-ui-personalization'
							}, () => null);
						} catch (error) {
							console.error('[personalization] brand slot registration failed', error);
						}
					} else if (!hidden && dispose !== void 0) {
						dispose();
						dispose = void 0;
					}
				};
				sync();
				const unsubscribe = store.subscribe(sync);
				return () => {
					unsubscribe();
					if (dispose !== void 0) dispose();
					dispose = void 0;
				};
			});
		}

		/**
		 * Keep the brand-collapse rule in the document exactly while the hide switch is
		 * on, so the emptied row stops holding its height.
		 * @param ctx - plugin context.
		 */
		function registerBrandCollapse(ctx) {
			const tag = document.createElement('style');
			tag.dataset.plugin = 'dsh-ui-personalization';
			tag.dataset.pluginCss = BRAND_COLLAPSE_TAG;
			tag.textContent = BRAND_COLLAPSE_CSS;
			const sync = () => {
				const hidden = store.getSnapshot().hideBrand;
				if (hidden && tag.parentNode === null) document.head.appendChild(tag);
				else if (!hidden && tag.parentNode !== null) tag.remove();
			};
			sync();
			const unsubscribe = store.subscribe(sync);
			ctx.effect(() => () => {
				unsubscribe();
				tag.remove();
			}, 'ui-personalization: brand collapse');
		}

		/** The cross on the avatar's corner badge. */
		function RemoveIcon() {
			return h('svg', {
				viewBox: '0 0 24 24',
				width: 12,
				height: 12,
				fill: 'none',
				stroke: 'currentColor',
				strokeWidth: 2.5,
				strokeLinecap: 'round',
				'aria-hidden': 'true'
			}, h('path', { d: 'M5 5l14 14' }), h('path', { d: 'M19 5 5 19' }));
		}

		/** The pencil shown over the avatar while the pointer or keyboard focus is on it. */
		function EditIcon() {
			return h('svg', {
				viewBox: '0 0 24 24',
				width: 20,
				height: 20,
				fill: 'none',
				stroke: 'currentColor',
				strokeWidth: 2,
				strokeLinecap: 'round',
				strokeLinejoin: 'round',
				'aria-hidden': 'true'
			}, h('path', { d: 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z' }), h('path', { d: 'M12 20h9' }));
		}

		/** The Settings section this plugin owns; the shell renders its nav cell. */
		function PersonalizationSection({ t }) {
			const profile = useSource(store);
			const fileInput = React.useRef(null);
			const [failed, setFailed] = React.useState(false);
			const pick = () => fileInput.current?.click();
			const onFile = (event) => {
				const file = event.target.files?.[0];
				event.target.value = '';
				if (file === undefined) return;
				setFailed(false);
				toAvatarDataUrl(file, (value) => {
					if (value === null) setFailed(true);
					else store.update({ avatar: value });
				});
			};
			/* The avatar is the picker: clicking it opens the file dialog and the pencil
			 * appears over it on hover or keyboard focus. The remove badge is a sibling
			 * button on its corner, so a click there never falls through to the picker
			 * (and a button inside a button would not be markup the browser accepts). */
			const preview = h('div', { className: 'dshprf_pick' }, h('button', {
				type: 'button',
				className: 'dshprf_avatar dshprf_preview dshprf_pickBtn',
				title: t('action.upload'),
				'aria-label': t('action.upload'),
				onClick: pick
			}, h(Avatar, {
				profile,
				t,
				className: profile.avatar === null ? 'dshprf_initial' : 'dshprf_image'
			}), h('span', {
				className: 'dshprf_scrim',
				'aria-hidden': 'true'
			}, h(EditIcon, null))), profile.avatar === null ? null : h('button', {
				type: 'button',
				className: 'dshprf_remove',
				title: t('action.reset'),
				'aria-label': t('action.reset'),
				onClick: () => store.update({ avatar: null })
			}, h(RemoveIcon, null)));
			const avatarField = h('div', { className: 'dshprf_field' }, h('div', { className: 'dshprf_fieldText' }, h('div', {
				className: 'dshprf_fieldTitle'
			}, t('field.avatar')), h('div', { className: 'dshprf_fieldDesc' }, t('field.avatar.desc')), failed ? h('div', {
				className: 'dshprf_fieldError'
			}, t('avatar.failed')) : null), h('div', {
				className: 'dshprf_fieldControl'
			}, h('input', {
				ref: fileInput,
				type: 'file',
				accept: 'image/*',
				style: { display: 'none' },
				onChange: onFile
			}), preview));
			const nicknameField = h('div', { className: 'dshprf_field' }, h('div', { className: 'dshprf_fieldText' }, h('div', {
				className: 'dshprf_fieldTitle'
			}, t('field.nickname'))), h('div', { className: 'dshprf_fieldControl' }, h('input', {
				className: 'dshprf_input',
				type: 'text',
				value: profile.nickname,
				placeholder: t('field.nickname.placeholder'),
				'aria-label': t('field.nickname'),
				onChange: (event) => store.update({ nickname: event.target.value })
			})));
			/* Two blocks: the identity row we take over, and the shell chrome we hide.
			 * Each switch leads its own block. */
			const identityCard = h('div', { className: 'dshprf_card' }, h(SwitchRow, {
				t,
				titleKey: 'field.enable',
				descKey: 'field.enable.desc',
				checked: profile.enabled,
				onToggle: () => store.update({ enabled: !profile.enabled })
			}), avatarField, nicknameField);
			const chromeCard = h('div', { className: 'dshprf_card' }, h(SwitchRow, {
				t,
				titleKey: 'field.hideBrand',
				checked: profile.hideBrand,
				onToggle: () => store.update({ hideBrand: !profile.hideBrand })
			}));
			return h('section', {
				className: 'dshprf_section',
				'aria-label': t('nav')
			}, identityCard, chromeCard, h('p', { className: 'dshprf_footnote' }, t('page.footnote'), ' · v' + PLUGIN_VERSION));
		}

		return {
			inject: ['slots', 'locale'],
			apply(ctx) {
				ctx.effect(() => ctx.locale.register(NS, {
					en,
					zh
				}), 'ui-personalization: dictionaries');
				const t = ctx.locale.bind(NS);
				ctx.effect(() => {
					const tag = document.createElement('style');
					tag.dataset.plugin = 'dsh-ui-personalization';
					tag.dataset.pluginCss = CSS_TAG;
					tag.textContent = CSS;
					document.head.appendChild(tag);
					return () => tag.remove();
				}, 'ui-personalization: styles');
				/* The Web deployment may not offer the account Remote at all, so it stays
				 * an optional dependency and reports its own absence instead of failing
				 * silently: the identity row simply renders without the figure. */
				let remoteReady = false;
				ctx.effect(() => {
					const id = setTimeout(() => {
						if (!remoteReady) balance.set({
							status: 'unavailable',
							text: null
						});
					}, BALANCE_READY_TIMEOUT_MS);
					return () => clearTimeout(id);
				}, 'ui-personalization: balance availability');
				ctx.inject(['remote', 'remote.account'], (scope) => {
					remoteReady = true;
					const version = readClientVersion();
					/* No version means no verifiable client identity to send. Hide the
					 * figure (the plugin's usual posture) instead of guessing one. */
					if (version === null) {
						balance.set({
							status: 'unavailable',
							text: null
						});
						return;
					}
					const account = scope.remote.account;
					let closed = false;
					let pending = false;
					const metadata = () => ({
						version,
						locale: ctx.locale.getSnapshot().active,
						timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60
					});
					const load = async () => {
						if (pending) return;
						pending = true;
						try {
							const result = await account.getBalance(metadata());
							if (closed) return;
							if (result !== null && result !== void 0 && result.ok === true) {
								const text = formatBalance(result.value);
								balance.set(text === null ? {
									status: 'signed-out',
									text: null
								} : {
									status: 'ready',
									text
								});
							} else balance.set({
								status: 'failed',
								text: null
							});
						} catch (_error) {
							/* Offline, expired credential, or a rejected build version. */
							if (!closed) balance.set({
								status: 'failed',
								text: null
							});
						} finally {
							pending = false;
						}
					};
					loadBalance = load;
					/* Fire once before touching the stream, so a stream that cannot open
					 * still leaves the read on the table. */
					load();
					/* The account state arrives on its own stream; its first frame is what
					 * makes the credential usable, so later reads follow the stream rather
					 * than racing the boot. */
					const stream = scope.remote.$stream({
						name: 'profile-account',
						open: (signal) => account.watch(signal),
						ended: () => new Error('profile: account stream ended')
					});
					scope.effect(() => () => {
						closed = true;
						loadBalance = () => {};
						return stream.dispose();
					}, 'ui-personalization: account stream');
					(async () => {
						for await (const frame of stream) {
							frame.accept();
							load();
						}
					})().catch(() => {});
					scope.effect(() => {
						const id = setInterval(() => {
							if (document.visibilityState === 'visible') load();
						}, BALANCE_REFRESH_MS);
						return () => clearInterval(id);
					}, 'ui-personalization: balance refresh');
				});
				ctx.slots.inject('settings.launcher', () => {
					let dispose;
					const sync = () => {
						const enabled = store.getSnapshot().enabled;
						if (enabled && dispose === void 0) {
							try {
								/* Priority -1 outranks the shipped account launcher; the lowest
								 * priority renders, so the built-in menu returns when this is off. */
								dispose = ctx.slots.register({
									name: 'settings.launcher',
									priority: -1,
									locale: NS,
									registrant: 'dsh-ui-personalization',
									inject: () => bridge
								}, IdentityLauncher);
							} catch (error) {
								console.error('[personalization] launcher registration failed', error);
							}
						} else if (!enabled && dispose !== void 0) {
							dispose();
							dispose = void 0;
						}
					};
					sync();
					const unsubscribe = store.subscribe(sync);
					return () => {
						unsubscribe();
						if (dispose !== void 0) dispose();
						dispose = void 0;
					};
				});
				/* The hide switch empties the two brand seats, then drops the height the
				 * shell gives their row. */
				registerBrandHider(ctx, 'sidebar.brand.mark');
				registerBrandHider(ctx, 'sidebar.brand.name');
				registerBrandCollapse(ctx);
				/* One nav cell in the Settings panel, after the shipped Agent presets.
				 * The shell owns the nav chrome and the section icon. */
				ctx.slots.inject('settings.section', () => ctx.slots.register({
					name: 'settings.section',
					id: SECTION_ID,
					order: 25,
					label: () => t('nav'),
					locale: NS,
					registrant: 'dsh-ui-personalization'
				}, PersonalizationSection));
			}
		};
	}
});
