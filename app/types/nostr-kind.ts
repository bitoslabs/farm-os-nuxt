/**
 * Nostr Event Kinds organized by domain
 *
 * Ranges:
 * - 30078-30099: Store Configuration
 * - 30100-30199: Catalog (Products, Categories, Units)
 * - 30200-30299: Transactions (Orders, Payments, Refunds)
 * - 30300-30399: Customers & Loyalty
 * - 30400-30499: Inventory Management
 * - 30500-30599: Staff & Access Control
 * - 30600-30699: Branch Management
 * - 30700-30799: Supply Chain (Suppliers, POs)
 * - 30800-30899: Accounting
 * - 30950-30999: Marketplace Integration
 * - 31100-31199: Project Manager (Issues, Sprints, Boards)
 */
export declare const NOSTR_KINDS: {
    /** User profile metadata (NIP-01) */
    readonly PROFILE: 0;
    /** Text note / Short-form content (NIP-01) */
    readonly TEXT_NOTE: 1;
    /** Contact list / Follow list (NIP-02) */
    readonly CONTACT_LIST: 3;
    /** Encrypted direct message (NIP-04) */
    readonly ENCRYPTED_DM: 4;
    /** Event deletion (NIP-09) */
    readonly DELETION: 5;
    /** Reaction to an event (NIP-25) */
    readonly REACTION: 7;
    /** Typing indicator (ephemeral) */
    readonly TYPING_INDICATOR: 1040;
    /** POS real-time alert (new order, bill request, waiter call) - cross-device */
    readonly POS_ALERT: 1050;
    /** Zap receipt (NIP-57) */
    readonly ZAP_RECEIPT: 9735;
    /** Staff authentication challenge/response */
    readonly STAFF_AUTH: 22242;
    /** HTTP authentication (NIP-98) */
    readonly HTTP_AUTH: 27235;
    /** Store settings, config, preferences (private/encrypted) */
    readonly STORE_SETTINGS: 30078;
    /** Public store profile for marketplace discovery */
    readonly STORE_PROFILE: 30079;
    /** Table/room layout and status */
    readonly TABLE: 30080;
    /** Individual product listing */
    readonly PRODUCT: 30100;
    /** Product category/group */
    readonly CATEGORY: 30101;
    /** Unit of measurement (pc, kg, etc.) */
    readonly UNIT: 30102;
    /** Product modifier groups (size, toppings) */
    readonly MODIFIER_GROUP: 30103;
    /** Ingredient for recipes */
    readonly INGREDIENT: 30104;
    /** Recipe (ingredients + instructions) */
    readonly RECIPE: 30105;
    /** Recipe category */
    readonly RECIPE_CATEGORY: 30106;
    /** Combo/bundle definition */
    readonly COMBO_DEFINITION: 30107;
    /** Order record */
    readonly ORDER: 30200;
    /** Payment proof/receipt */
    readonly PAYMENT: 30201;
    /** Refund record */
    readonly REFUND: 30202;
    /** Invoice for customers */
    readonly INVOICE: 30203;
    /** Invoice payment record */
    readonly INVOICE_PAYMENT: 30204;
    /** Contract/rental agreement */
    readonly CONTRACT: 30205;
    /** Rental asset (room, equipment, vehicle) */
    readonly RENTAL_ASSET: 30206;
    /** Rental booking/reservation */
    readonly RENTAL_BOOKING: 30207;
    /** Contract/asset/booking change history log */
    readonly CONTRACT_HISTORY: 30208;
    /** Contract payment record */
    readonly CONTRACT_PAYMENT: 30209;
    /** Table session (active dining visit) */
    readonly TABLE_SESSION: 30210;
    /** Kitchen ticket (prep ticket from order items) */
    readonly KITCHEN_TICKET: 30211;
    /** Kitchen status event (item/ticket status history) */
    readonly KITCHEN_STATUS_EVENT: 30212;
    /** Printer job (print queue and result) */
    readonly PRINTER_JOB: 30213;
    /** Customer profile */
    readonly CUSTOMER: 30300;
    /** Loyalty points transaction */
    readonly LOYALTY_POINTS: 30301;
    /** Reward claim/redemption */
    readonly LOYALTY_REWARD: 30302;
    /** Coupon/discount code */
    readonly COUPON: 30310;
    /** Membership tier/plan */
    readonly MEMBERSHIP: 30311;
    /** Membership subscription */
    readonly MEMBERSHIP_SUBSCRIPTION: 30312;
    /** Promotion (BOGO, discounts, bundles) */
    readonly PROMOTION: 30313;
    /** Promotion usage log */
    readonly PROMOTION_USAGE: 30314;
    /** Membership check-in (gym attendance) */
    readonly MEMBERSHIP_CHECK_IN: 30315;
    /** Stock adjustment record */
    readonly STOCK_ADJUSTMENT: 30400;
    /** Inventory count session */
    readonly INVENTORY_COUNT: 30401;
    /** Cycle count record */
    readonly CYCLE_COUNT: 30402;
    /** Staff member profile */
    readonly STAFF_MEMBER: 30500;
    /** POS session log */
    readonly POS_SESSION: 30501;
    /** Audit trail entry */
    readonly AUDIT_LOG: 30502;
    /** Company code → owner pubkey mapping */
    readonly COMPANY_INDEX: 30503;
    /** Permission grant event */
    readonly PERMISSION_GRANT: 30510;
    /** Permission revoke event */
    readonly PERMISSION_REVOKE: 30511;
    /** Wrapped company data encryption key grant */
    readonly COMPANY_KEY_GRANT: 30512;
    /** Shift record (opening/closing cash, sales summary) */
    readonly SHIFT: 30520;
    /** Cash drawer event (cash in/out, paid out, bank deposit) */
    readonly CASH_EVENT: 30521;
    /** Staff sync data (cross-device synchronization) */
    readonly STAFF_SYNC: 30590;
    /** User workspace list (encrypted, synced across devices with same nsec) */
    readonly USER_WORKSPACES: 30591;
    /** Branch/location details */
    readonly BRANCH: 30600;
    /** Restaurant table setup by branch */
    readonly RESTAURANT_TABLE: 30610;
    /** Printer route (category/item to printer mapping) */
    readonly PRINTER_ROUTE: 30611;
    /** Supplier profile */
    readonly SUPPLIER: 30700;
    /** Branch-specific stock levels */
    readonly BRANCH_STOCK: 30701;
    /** Purchase order */
    readonly PURCHASE_ORDER: 30702;
    /** Inter-branch stock transfer */
    readonly STOCK_TRANSFER: 30703;
    /** Chart of accounts entry */
    readonly ACCOUNT: 30800;
    /** Journal entry (double-entry) */
    readonly JOURNAL_ENTRY: 30801;
    /** Expense record */
    readonly EXPENSE: 30802;
    /** Financial report snapshot */
    readonly FINANCIAL_REPORT: 30803;
    /** Dynamic help article (wiki-style) */
    readonly HELP_ARTICLE: 30850;
    /** Replaceable receipt event */
    readonly RECEIPT: 31111;
    /** Team chat channel metadata (replaceable) - Legacy NIP-28 */
    readonly CHAT_CHANNEL: 30900;
    /** Chat message (regular event) - Legacy NIP-28 */
    readonly CHAT_MESSAGE: 1234;
    /** System plan catalog */
    readonly SYSTEM_PLAN: 30960;
    /** System subscription */
    readonly SYSTEM_SUBSCRIPTION: 30961;
    /** System invoice */
    readonly SYSTEM_INVOICE: 30962;
    /** System payment */
    readonly SYSTEM_PAYMENT: 30963;
    /** System usage snapshot */
    readonly SYSTEM_USAGE_SNAPSHOT: 30964;
    /** System payment provider */
    readonly SYSTEM_PAYMENT_PROVIDER: 30965;
    /** Store listing for marketplace discovery (search, filters) */
    readonly MARKETPLACE_LISTING: 30950;
    /** Product listing for cross-store discovery & catalog sync */
    readonly MARKETPLACE_PRODUCT: 30951;
    /** Cross-store order routing (multi-vendor orders) */
    readonly MARKETPLACE_ORDER: 30952;
    /** Store-to-store connection/partnership (follow, partner, supplier) */
    readonly STORE_CONNECTION: 30953;
    /** Public store profile for discovery (enhanced profile with hours, services) */
    readonly PUBLIC_STORE_PROFILE: 30954;
    /** Customer review/rating for a store */
    readonly MARKETPLACE_REVIEW: 30955;
    /** Channel creation event (NIP-28) */
    readonly CHANNEL_CREATE: 40;
    /** Channel message (NIP-28) */
    readonly CHANNEL_MESSAGE: 42;
    /** Group metadata (name, avatar, settings) - NIP-29 */
    readonly GROUP_METADATA: 39000;
    /** Group admins list - NIP-29 */
    readonly GROUP_ADMINS: 39001;
    /** Group members list - NIP-29 */
    readonly GROUP_MEMBERS: 39002;
    /** Group chat message - NIP-29 */
    readonly GROUP_CHAT_MESSAGE: 9;
    /** Delete message from group - NIP-29 */
    readonly GROUP_DELETE_MESSAGE: 5;
    /** Project board (like a Jira Project) */
    readonly PM_PROJECT: 31100;
    /** Sprint / iteration */
    readonly PM_SPRINT: 31101;
    /** Issue / ticket (bug, story, task, epic) */
    readonly PM_ISSUE: 31102;
    /** Comment on an issue */
    readonly PM_COMMENT: 31105;
    /** Label / tag definition */
    readonly PM_LABEL: 31104;
    /** Milestone / version */
    readonly PM_MILESTONE: 31105;
    /** Workflow status config (columns: To Do → Done) */
    readonly PM_WORKFLOW: 31106;
    /** Kanban board view config */
    readonly PM_BOARD: 31107;
    /** Project Wiki / Rich Markdown Page */
    readonly PM_PAGE: 31109;
};
/**
 * Type for all valid Nostr event kinds
 */
export type NostrKind = (typeof NOSTR_KINDS)[keyof typeof NOSTR_KINDS];
/**
 * Get kind name from kind number (for debugging)
 */
export declare function getKindName(kind: number): string | undefined;