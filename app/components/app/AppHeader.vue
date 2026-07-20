<script setup lang="ts">
import { useSettings } from "~/composables/useSettings";
const { settings, isLoggedIn, npub, locked, lock, logout } = useSettings();
const cmdkOpen = useState<boolean>("cmdk-open", () => false);
const mobileNavOpen = useState<boolean>("mobile-nav-open", () => false);
const router = useRouter();
const { t } = useI18n();

// Real account data — identity ONLY (no hardcoded farm-owner fallback).
// Name from the kind-0 profile; otherwise a friendly anon label. The npub is
// always shown as the subtitle, so the real account is always visible.
const identity = computed(() => settings.value.identity);
const displayName = computed(
  () => identity.value.name?.trim() || "Anonymous farmer",
);
const displayPicture = computed(() => identity.value.picture);
const initials = computed(() =>
  displayName.value === "Anonymous farmer"
    ? "AN"
    : displayName.value
        .split(/\s+/)
        .map((w) => w[0])
        .filter(Boolean)
        .join("")
        .slice(0, 2)
        .toUpperCase(),
);
const npubShort = computed(() =>
  npub.value ? `${npub.value.slice(0, 18)}…${npub.value.slice(-6)}` : "",
);

// Account dropdown menu (array-of-arrays => dividers render between groups)
const accountItems = computed(() => {
  const canLock =
    identity.value.method === "nsec" &&
    identity.value.encrypted &&
    !locked.value;
  const main = [
    {
      label: t("account.publicProfile"),
      icon: "i-lucide-external-link",
      onSelect: () => router.push(`/u/${npub.value}`),
    },
    {
      label: t("account.settings"),
      icon: "i-lucide-settings",
      onSelect: () => router.push("/settings/account"),
    },
    ...(locked.value
      ? [
          {
            label: t("account.unlock"),
            icon: "i-lucide-lock-open",
            onSelect: () => router.push("/settings/account"),
          },
        ]
      : canLock
        ? [
            {
              label: t("account.lock"),
              icon: "i-lucide-lock",
              onSelect: () => lock(),
            },
          ]
        : []),
  ];
  const danger = [
    {
      label: t("account.signOut"),
      icon: "i-lucide-log-out",
      color: "error",
      onSelect: () => logout(),
    },
  ];
  return [main, danger];
});
</script>

<template>
  <header
    class="h-[var(--app-header-height)] flex items-center gap-2 sm:gap-3 px-4 sm:px-6 md:px-8 py-3 sm:py-4 border-b border-app sticky top-0 z-20 backdrop-blur-md bg-[var(--bg)]/70"
  >
    <!-- Hamburger (mobile) -->
    <button
      class="btn-ghost w-10 h-10 rounded-lg flex items-center justify-center md:hidden shrink-0"
      aria-label="Open menu"
      :title="t('header.openMenu')"
      @click="mobileNavOpen = true"
    >
      <UIcon name="i-lucide-menu" class="text-base" />
    </button>

    <!-- Mobile brand (icon-only to save space) -->
    <div class="md:hidden">
      <NuxtLinkLocale to="/" aria-label="GardenOS home"
        ><AppLogo :size="28" compact
      /></NuxtLinkLocale>
    </div>

    <!-- Search (opens command palette) — desktop -->
    <button
      class="relative flex-1 max-w-md hidden sm:flex items-center gap-3 input-glass pl-11 pr-3 py-2.5 rounded-lg text-sm text-muted-2 text-left"
      @click="cmdkOpen = true"
    >
      <UIcon
        name="i-lucide-search"
        class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-2 text-sm"
      />
      <span class="flex-1">{{ $t("header.searchPlaceholder") }}</span>
      <kbd
        class="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-muted font-mono"
        >⌘K</kbd
      >
    </button>

    <!-- Search icon (mobile) -->
    <button
      class="btn-ghost w-10 h-10 rounded-lg flex items-center justify-center sm:hidden ml-auto shrink-0"
      :aria-label="t('header.search')"
      @click="cmdkOpen = true"
    >
      <UIcon name="i-lucide-search" class="text-base" />
    </button>

    <div class="flex items-center gap-2 sm:ml-auto">
      <AppSyncStatus class="hidden md:flex" />
      <QuickSettings />

      <button
        class="btn-ghost w-10 h-10 rounded-lg flex items-center justify-center relative shrink-0"
        :aria-label="t('header.notifications')"
      >
        <UIcon name="i-lucide-bell" class="text-sm" />
        <span class="notif-dot" />
      </button>
      <button
        class="btn-ghost w-10 h-10 rounded-lg flex items-center justify-center lg:flex shrink-0"
        :aria-label="t('header.messages')"
      >
        <UIcon name="i-lucide-mail" class="text-sm" />
      </button>

      <div class="w-px h-6 bg-[var(--border)] mx-1 hidden lg:block" />

      <!-- Auth-aware identity -->
      <template v-if="!isLoggedIn">
        <NuxtLinkLocale
          to="/login"
          class="btn-ghost px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hidden lg:flex"
        >
          <UIcon name="i-lucide-log-in" class="text-xs" />{{
            t("header.signIn")
          }}
        </NuxtLinkLocale>
        <NuxtLinkLocale
          to="/register"
          class="btn-accent px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shrink-0"
        >
          <UIcon name="i-lucide-user-plus" class="text-xs" /><span
            class="hidden sm:inline"
            >{{ t("header.getStarted") }}</span
          ><span class="sm:hidden">{{ t("header.start") }}</span>
        </NuxtLinkLocale>
      </template>

      <UDropdownMenu
        v-else
        :items="accountItems"
        :content="{ align: 'end', sideOffset: 8 }"
        :ui="{ content: 'w-64' }"
      >
        <button
          class="flex items-center gap-2 px-1.5 sm:px-2 py-1.5 rounded-lg hover:bg-surface transition shrink-0 cursor-pointer"
        >
          <div
            v-if="locked"
            class="w-8 h-8 rounded-full bg-[rgba(251,191,36,0.15)] flex items-center justify-center"
            title="Identity locked"
          >
            <UIcon name="i-lucide-lock" class="text-warning text-xs" />
          </div>
          <div
            v-else
            class="w-8 h-8 rounded-full overflow-hidden avatar-grad ring-2 ring-[var(--accent)] flex items-center justify-center"
          >
            <img
              v-if="displayPicture"
              :src="displayPicture"
              :alt="displayName"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-[var(--bg)] font-bold text-xs">{{
              initials
            }}</span>
          </div>
          <div class="hidden md:block leading-tight text-left">
            <div class="text-sm font-semibold truncate max-w-[140px]">
              {{ displayName }}
            </div>
            <div class="text-[11px] text-muted font-mono">{{ npubShort }}</div>
          </div>
          <UIcon
            name="i-lucide-chevron-down"
            class="text-xs text-muted-2 hidden md:flex"
          />
        </button>
      </UDropdownMenu>
    </div>
  </header>
</template>

<style scoped>
.notif-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  background: var(--accent);
  border-radius: 50%;
  border: 2px solid var(--bg);
}
</style>
