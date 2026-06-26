# Icon Inventory — TGroup Website (for the icon-redesign project)

> Parked side-project (separate from the Investor Portal). Captured 2026-06-25 by a read-only inventory pass. This is the durable starting point for redesigning the site's icons in a consistent custom line style.

## Snapshot
| Metric | Value |
|---|---|
| Icon library | **lucide-react v0.330.0** (the *only* icon library; no heroicons/react-icons) |
| Distinct icons in use | **91** |
| Files importing icons | **202** (203 import statements) |
| Centralization | Mostly **ad-hoc per-file imports**; partial registries in `Layout.tsx` (`ICON_MAP`), `CommissionFlowTabs.tsx`, `StatCardModule.tsx` |
| Custom inline SVGs | 5 components (`CtvDiscountVoucherCard`, `ReportsFilters`, `DonutChart`, `Landing`, `PermissionBoard/MatrixView`) + `public/favicon.svg` |
| Icon design tokens | **None** — all sizing/color via Tailwind utility classes + inline styles |

## Sizing conventions (Tailwind)
`w-3 h-3` (status dots) · `w-3.5 h-3.5` (tabs/chips) · `w-4 h-4` (controls/modals) · `w-5 h-5` (sidebar nav) · `w-6 h-6` / `sm:w-7` (cards/hero).

## Color conventions
`text-primary` (= `--accent-500` orange `#F97316`) default · `text-gray-400/500` muted · status `text-green-600` / `text-red-500/600` · per-feature tab colors (slate/sky/violet/orange/emerald/rose) · stat cards use inline hex (`stat.color`, 15% bg).

## Highest-usage icons (redesign these first)
X (45) · Search (29) · Loader2 (27) · Clock (25) · ChevronDown (24) · Check (23) · MapPin (22) · ChevronRight (20) · Stethoscope (17) · Users (16) · User (15) · Plus (14) · CalendarDays (14) · Phone (13) · CheckCircle2 (13) · FileText (12) · AlertTriangle (12) · Calendar (11) · Pencil (10).

## Full distinct-icon list (91)
X, Search, Loader2, Clock, ChevronDown, Check, MapPin, ChevronRight, Stethoscope, Users, User, Plus, CalendarDays, Phone, CheckCircle2, FileText, AlertTriangle, Calendar, Pencil, Tag, Building2, UserCheck, Trash2, Shield, Globe, UserPlus, Eye, DollarSign, ChevronLeft, CheckCircle, AlertCircle, XCircle, Wallet, ScanFace, RefreshCw, MessageSquare, Mail, Edit2, ArrowLeft, TrendingUp, Receipt, ExternalLink, ChevronUp, ToggleRight, ToggleLeft, EyeOff, CalendarPlus, UserRound, TrendingDown, Sparkles, Send, Save, QrCode, Network, Loader, Link2, Hash, Handshake, Filter, Copy, Camera, UserCog, SlidersHorizontal, Share2, ReceiptText, Paperclip, Palette, LogOut, ListChecks, Info, Home, Gift, FileSpreadsheet, FileCode, CreditCard, Circle, Bug, Bell, BadgeDollarSign, ArrowUpCircle, ArrowRight, ArrowDownCircle, WalletCards, UserX, Upload, SwitchCamera, Star, Settings2, Scale, Route, RotateCcw, Repeat, Percent, Package, Minus, Megaphone, LockKeyhole, Lock, LayoutList, Layers, Landmark, KeyRound, Image, Headphones, HandCoins, GripVertical, GitCommit, GitBranch, FolderOpen, Edit3, Download, Coins, ClipboardPlus, CalendarCheck, Calculator, Briefcase, BookOpen, Award, ArrowUpRight, ArrowUpDown, ArrowRightCircle, ArrowDownRight, Activity.

## Recommended redesign approach (when we get to it)
1. Introduce an `Icon` wrapper at `src/components/ui/Icon.tsx` (name→component map) so 202 scattered imports become one swap point.
2. Add icon design tokens (`--icon-sm/md/lg`) preserving the 6 existing sizes.
3. Draw/replace the ~19 highest-usage icons first, then the long tail; keep the same names so call-sites don't change.
4. Keep the 5 custom inline SVGs in scope as a separate small pass.
