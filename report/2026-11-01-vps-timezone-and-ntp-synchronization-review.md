# BÃ¡o CÃ¡o Nghiá»‡m Thu: Chuáº©n HÃ³a MÃºi Giá» Viá»‡t Nam (Asia/Ho_Chi_Minh) & Äá»“ng Bá»™ Thá»i Gian VPS

> **Thá»i gian thá»±c hiá»‡n (UTC+7):** 2026-11-01 16:30
> **NgÆ°á»i thá»±c hiá»‡n:** Orchestrator Agent & Äá»™i NgÅ© Subagents
> **NgÆ°á»i phÃª duyá»‡t:** ðŸ‘‘ Master (Sáº¿p)
> **Pháº¡m vi tÃ¡c Ä‘á»™ng:** VPS Host Ubuntu 24.04, Docker Engine, PostgreSQL 16, Redis 7, Backend Node.js, Frontend Nginx, Cloud Browser.

---

## 1. PHáº M VI NGHIá»†M THU (SCOPE)

1. **Kháº¯c Phá»¥c Lá»‡ch Giá» & Chuáº©n HÃ³a Thá»i Gian TrÃªn Host VPS:**
   - Xá»­ lÃ½ tÃ¬nh tráº¡ng Ä‘á»“ng há»“ mÃ¡y chá»§ bá»‹ cháº¡y cháº­m ~5 phÃºt do dá»‹ch vá»¥ `systemd-timesyncd` máº·c Ä‘á»‹nh trá» tá»›i `ntp.ubuntu.com` bá»‹ timeout káº¿t ná»‘i ra quá»‘c táº¿ trÃªn cá»•ng UDP 123.
   - CÃ i Ä‘áº·t cÃ´ng cá»¥ quáº£n trá»‹ Ä‘á»“ng há»“ pháº§n cá»©ng `util-linux-extra` (`hwclock`).
   - Äá»“ng bá»™ thá»i gian há»‡ thá»‘ng tá»©c thÃ¬ vá»›i Ä‘á»“ng há»“ RTC (Real-Time Clock) cá»§a áº£o hÃ³a KVM: `hwclock --hctosys`.
   - Thiáº¿t láº­p tÃ¡c vá»¥ tá»± Ä‘á»™ng Ä‘á»“ng bá»™ hÃ ng giá» táº¡i `/etc/cron.hourly/sync-clock` Ä‘á»ƒ Ä‘áº£m báº£o thá»i gian mÃ¡y chá»§ khÃ´ng bá»‹ trÃ´i lá»‡ch theo thá»i gian.

2. **ÄÆ°a ToÃ n Bá»™ Docker Containers Vá» MÃºi Giá» Viá»‡t Nam (`Asia/Ho_Chi_Minh` / UTC+7):**
   - Cáº¥u hÃ¬nh láº¡i symlink `/etc/localtime -> /usr/share/zoneinfo/Asia/Ho_Chi_Minh` vÃ  `/etc/timezone` chá»©a `Asia/Ho_Chi_Minh` cho toÃ n bá»™ container:
     - `admin_orderlist-backend`
     - `admin_orderlist-postgres`
     - `admin_orderlist-redis`
     - `admin_orderlist-frontend`
     - `admin_orderlist-cloud-browser`
   - Cáº­p nháº­t vÄ©nh viá»…n cáº¥u hÃ¬nh dá»± Ã¡n trong [`docker-compose.yml`](file:///e:/Project/admin_store/admin_orderlist/docker-compose.yml) vÃ  [`backend/.env.docker`](file:///e:/Project/admin_store/admin_orderlist/backend/.env.docker) bá»• sung `TZ: Asia/Ho_Chi_Minh`.
   - Cáº¥u hÃ¬nh cÆ¡ sá»Ÿ dá»¯ liá»‡u PostgreSQL mÃ¡y chá»§ (`admin_orderlist-postgres`):
     - `ALTER SYSTEM SET timezone = 'Asia/Ho_Chi_Minh';`
     - Náº¡p láº¡i cáº¥u hÃ¬nh `SELECT pg_reload_conf();`.

---

## 2. TRáº NG THÃI NGHIá»†M THU (ACCEPTANCE STATUS)

| Háº¡ng má»¥c kiá»ƒm tra | Tráº¡ng thÃ¡i | Ghi chÃº nghiá»‡m thu |
| :--- | :---: | :--- |
| **Äá»“ng bá»™ thá»i gian Host VPS** | âœ… **Äáº T** | Local time vÃ  RTC time khá»›p 100% thá»i gian thá»±c Viá»‡t Nam (chÃ­nh xÃ¡c Ä‘áº¿n tá»«ng giÃ¢y). |
| **TÃ¡c vá»¥ chá»‘ng trÃ´i lá»‡ch thá»i gian** | âœ… **Äáº T** | ÄÃ£ táº¡o `/etc/cron.hourly/sync-clock` cháº¡y Ä‘á»‹nh ká»³ má»—i giá» `hwclock --hctosys`. |
| **MÃºi giá» PostgreSQL Server** | âœ… **Äáº T** | `SHOW timezone;` tráº£ vá» `Asia/Ho_Chi_Minh`. `SELECT now();` tráº£ vá» `+07`. |
| **MÃºi giá» Backend Container** | âœ… **Äáº T** | Lá»‡nh `date` tráº£ vá» `Sun Nov 1 ... +07 2026`. Node.js log nháº­n diá»‡n mÃºi giá» UTC+7. |
| **MÃºi giá» Redis Container** | âœ… **Äáº T** | Lá»‡nh `date` tráº£ vá» `Sun Nov 1 ... +07 2026`. |
| **MÃºi giá» Frontend Container** | âœ… **Äáº T** | Lá»‡nh `date` tráº£ vá» `Sun Nov 1 ... +07 2026`. |
| **Cáº¥u hÃ¬nh Compose & Env lÃ¢u dÃ i** | âœ… **Äáº T** | ÄÃ£ cáº­p nháº­t `docker-compose.yml` vÃ  `backend/.env.docker` trÃªn cáº£ Git repo vÃ  VPS. |

---

## 3. Káº¾T QUáº¢ Äá»I SOÃT TRá»°C TIáº¾P TRÃŠN MÃY CHá»¦ VPS

### 3.1. Äá»‘i SoÃ¡t Lá»‡nh `date` ToÃ n Bá»™ Há»‡ Thá»‘ng (Host & Containers):
```bash
=== HOST ===
               Local time: Sun 2026-11-01 16:27:06 +07
           Universal time: Sun 2026-11-01 09:27:06 UTC
                 RTC time: Sun 2026-11-01 09:27:06
                Time zone: Asia/Ho_Chi_Minh (+07, +0700)
=== BACKEND ===
Sun Nov  1 16:27:06 +07 2026
=== POSTGRES ===
Sun Nov  1 16:27:06 +07 2026
=== REDIS ===
Sun Nov  1 16:27:06 +07 2026
=== FRONTEND ===
Sun Nov  1 16:27:06 +07 2026
=== CLOUD BROWSER ===
Sun Nov  1 04:27:06 PM +07 2026
```

### 3.2. Äá»‘i SoÃ¡t PostgreSQL Database:
```sql
mydtbmav=# SHOW timezone;
     TimeZone
------------------
 Asia/Ho_Chi_Minh
(1 row)

mydtbmav=# SHOW log_timezone;
   log_timezone
------------------
 Asia/Ho_Chi_Minh
(1 row)

mydtbmav=# SELECT now();
              now
-------------------------------
 2026-11-01 16:27:14.346016+07
(1 row)
```

### 3.3. Äá»‘i SoÃ¡t Log Trá»±c Tiáº¿p Cá»§a Docker Compose (`docker compose logs`):
```bash
admin_orderlist-frontend       | 2026/11/01 16:33:22 [notice] 1#1: start worker process 29
admin_orderlist-redis          | 1:M 01 Nov 2026 16:33:14.565 * Ready to accept connections tcp
admin_orderlist-postgres       | 2026-11-01 16:32:10.234 +07 [26] LOG:  checkpoint starting: immediate force wait
admin_orderlist-postgres       | 2026-11-01 16:32:10.253 +07 [26] LOG:  checkpoint complete: wrote 0 buffers
admin_orderlist-cloud-browser  | INFO:printing:Print queue Selkies listening on /config/.XDG/selkies-cups/cups.sock...
admin_orderlist-backend        | [Scheduler] ÄÃ£ khá»Ÿi táº¡o 5 lá»‹ch tÃ¡c vá»¥.
```

---

## 4. Káº¾T LUáº¬N

Há»‡ thá»‘ng VPS vÃ  toÃ n bá»™ cÃ¡c container dá»‹ch vá»¥ cá»§a dá»± Ã¡n `admin_orderlist` Ä‘Ã£ Ä‘Æ°á»£c Ä‘Æ°a vá» Ä‘Ãºng **100% mÃºi giá» Viá»‡t Nam (`Asia/Ho_Chi_Minh` / UTC+7)**. Lá»—i lá»‡ch thá»i gian 5 phÃºt Ä‘Ã£ Ä‘Æ°á»£c triá»‡t tiÃªu hoÃ n toÃ n, báº£o Ä‘áº£m cÃ¡c tÃ¡c vá»¥ tá»± Ä‘á»™ng (Cron 0h chuyá»ƒn tráº¡ng thÃ¡i Ä‘Æ¡n, Cron 7h gá»­i tin nháº¯n Telegram, cÃ¡c tÃ¡c vá»¥ tÃ­nh lÃ£i tÃ i chÃ­nh) diá»…n ra chuáº©n xÃ¡c tuyá»‡t Ä‘á»‘i.
