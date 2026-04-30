-- admin_orderlist consolidated database schema
-- DDL-only snapshot generated from the current local database.
-- Import business/static data from database backup separately.
-- Excludes user/business rows, seed rows, and Knex migration metadata.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;

CREATE SCHEMA admin;

CREATE SCHEMA audit;

CREATE SCHEMA cart;

CREATE SCHEMA common;

CREATE SCHEMA content;

CREATE SCHEMA customer;

CREATE SCHEMA customer_info;

CREATE SCHEMA customer_web;

CREATE SCHEMA cycles;

CREATE SCHEMA dashboard;

CREATE SCHEMA finance;

CREATE SCHEMA form_desc;

CREATE SCHEMA identity;

CREATE SCHEMA mavryk;

CREATE SCHEMA orders;

CREATE SCHEMA partner;

CREATE SCHEMA product;

CREATE SCHEMA promotion;

CREATE SCHEMA receipt;

CREATE SCHEMA review;

CREATE SCHEMA system_automation;

CREATE SCHEMA wallet;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE FUNCTION orders.fn_order_list_refund_force_positive() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_refund numeric := 0;
BEGIN
  IF NEW.refund IS NOT NULL THEN
    v_refund := COALESCE(
      NULLIF(regexp_replace(NEW.refund::text, '[^0-9.-]', '', 'g'), '')::numeric,
      0
    );
    NEW.refund := ABS(v_refund);
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION partner.fn_recalc_dashboard_total_import() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
      mks text[];
      mk text;
      v_sum numeric;
      v_profit numeric;
      r record;
    BEGIN
      mks := ARRAY[]::text[];
      IF TG_OP = 'DELETE' THEN
        IF OLD.logged_at IS NOT NULL THEN
          mks := array_append(mks, TO_CHAR(DATE_TRUNC('month', OLD.logged_at::timestamptz), 'YYYY-MM'));
        END IF;
      ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.logged_at IS NOT NULL THEN
          mks := array_append(mks, TO_CHAR(DATE_TRUNC('month', OLD.logged_at::timestamptz), 'YYYY-MM'));
        END IF;
        IF NEW.logged_at IS NOT NULL THEN
          mks := array_append(mks, TO_CHAR(DATE_TRUNC('month', NEW.logged_at::timestamptz), 'YYYY-MM'));
        END IF;
      ELSE
        IF NEW.logged_at IS NOT NULL THEN
          mks := array_append(mks, TO_CHAR(DATE_TRUNC('month', NEW.logged_at::timestamptz), 'YYYY-MM'));
        END IF;
      END IF;

      FOR r IN
        SELECT DISTINCT t.k AS k
        FROM unnest(mks) AS t(k)
        WHERE t.k IS NOT NULL AND t.k <> ''
      LOOP
        mk := r.k;
        SELECT COALESCE(SUM(import_cost::numeric), 0) INTO v_sum
        FROM "partner".supplier_order_cost_log
        WHERE logged_at IS NOT NULL
          AND TO_CHAR(DATE_TRUNC('month', logged_at::timestamptz), 'YYYY-MM') = mk;

        SELECT COALESCE(SUM(m), 0) INTO v_profit
        FROM (
          SELECT DISTINCT ON (l.order_list_id)

CASE
  WHEN UPPER(TRIM(COALESCE(ol.id_order::text, ''))) LIKE 'MAVN%'
       AND TRIM(COALESCE(ol.status::text, '')) = 'Đã Thanh Toán' THEN
    - COALESCE(ol.cost::numeric, 0)
  ELSE GREATEST(
    0,
    COALESCE(ol.gross_selling_price::numeric, ol.price::numeric, 0)
      - COALESCE(ol.cost::numeric, 0)
  )
END
 AS m
          FROM "partner".supplier_order_cost_log l
          INNER JOIN "orders".order_list ol ON ol.id = l.order_list_id
          WHERE l.logged_at IS NOT NULL
            AND TO_CHAR(DATE_TRUNC('month', l.logged_at::timestamptz), 'YYYY-MM') = mk
          ORDER BY l.order_list_id, l.id DESC
        ) sub;

        EXECUTE format(
          'INSERT INTO %I.%I (month_key, total_import, total_profit, updated_at) VALUES ($1, $2, $3, now()) ON CONFLICT (month_key) DO UPDATE SET total_import = EXCLUDED.total_import, total_profit = EXCLUDED.total_profit, updated_at = now()',
          'dashboard',
          'dashboard_monthly_summary'
        ) USING mk, v_sum, v_profit;
      END LOOP;
      RETURN COALESCE(NEW, OLD);
    END;
    $_$;

CREATE FUNCTION partner.fn_supplier_order_cost_log_on_success() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_unpaid CONSTANT text := 'Chưa Thanh Toán';
  v_renewal CONSTANT text := 'Cần Gia Hạn';
  v_paid CONSTANT text := 'Đã Thanh Toán';
  v_processing CONSTANT text := 'Đang Xử Lý';
  v_pending_refund CONSTANT text := 'Chưa Hoàn';
  v_pending_refund_legacy CONSTANT text := 'Chờ Hoàn';
  v_refunded CONSTANT text := 'Đã Hoàn';
  v_canceled CONSTANT text := 'Hủy';
  v_chua_tt_ncc CONSTANT text := 'Chưa Thanh Toán';
  v_is_mavryk boolean := false;
  v_is_mavn boolean := false;
  v_is_gift boolean := false;
  v_days_total numeric := 0;
  v_days_remaining numeric := 0;
  v_refund_for_log numeric := 0;
  v_cost numeric := 0;
  v_refund numeric := 0;
  v_latest_id bigint;
BEGIN
  IF NEW.supply_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_cost := COALESCE(NULLIF(regexp_replace(NEW.cost::text, '[^0-9.-]', '', 'g'), '')::numeric, 0);
  v_refund := COALESCE(NULLIF(regexp_replace(NEW.refund::text, '[^0-9.-]', '', 'g'), '')::numeric, 0);
  v_days_total := GREATEST(
    COALESCE(NULLIF(regexp_replace(NEW.days::text, '[^0-9.-]', '', 'g'), '')::numeric, 0),
    0
  );

  v_is_mavn := UPPER(TRIM(COALESCE(NEW.id_order::text, ''))) LIKE 'MAVN%';
  v_is_gift := UPPER(TRIM(COALESCE(NEW.id_order::text, ''))) LIKE 'MAVT%';

  SELECT EXISTS (
    SELECT 1
    FROM partner.supplier s
    WHERE s.id = NEW.supply_id
      AND LOWER(TRIM(COALESCE(s.supplier_name, ''))) = 'mavryk'
  )
  INTO v_is_mavryk;

  IF v_is_mavryk THEN
    DELETE FROM partner.supplier_order_cost_log WHERE order_list_id = NEW.id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NOT DISTINCT FROM v_paid
       AND (v_is_mavn OR v_is_gift)
    THEN
      INSERT INTO partner.supplier_order_cost_log (
        order_list_id,
        supply_id,
        id_order,
        import_cost,
        refund_amount,
        ncc_payment_status
      )
      VALUES (
        NEW.id,
        NEW.supply_id,
        COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
        v_cost,
        v_refund,
        v_chua_tt_ncc
      );
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT MAX(id) INTO v_latest_id
    FROM partner.supplier_order_cost_log
    WHERE order_list_id = NEW.id;

    IF (
      (COALESCE(OLD.status, '') = v_unpaid AND NEW.status IS NOT DISTINCT FROM v_paid)
      OR (COALESCE(OLD.status, '') = v_renewal AND NEW.status IS NOT DISTINCT FROM v_paid)
      OR (COALESCE(OLD.status, '') = v_processing AND NEW.status IS NOT DISTINCT FROM v_paid AND v_latest_id IS NULL)
    ) THEN
      INSERT INTO partner.supplier_order_cost_log (
        order_list_id,
        supply_id,
        id_order,
        import_cost,
        refund_amount,
        ncc_payment_status
      )
      VALUES (
        NEW.id,
        NEW.supply_id,
        COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
        v_cost,
        v_refund,
        v_chua_tt_ncc
      );
      RETURN NEW;
    END IF;

    IF OLD.status IS NOT DISTINCT FROM v_paid
       AND (
        NEW.status IS NOT DISTINCT FROM v_pending_refund
        OR NEW.status IS NOT DISTINCT FROM v_pending_refund_legacy
        OR NEW.status IS NOT DISTINCT FROM v_refunded
        OR NEW.status IS NOT DISTINCT FROM v_canceled
      )
    THEN
      v_days_remaining := GREATEST(
        0,
        (COALESCE(NEW.expired_at::date, CURRENT_DATE) - COALESCE(NEW.canceled_at::date, (NEW.canceled_at::timestamptz AT TIME ZONE 'UTC')::date))
      );

      IF v_cost > 0 AND v_days_total > 0 THEN
        v_refund_for_log := ROUND((v_cost * v_days_remaining) / v_days_total);
      ELSIF v_cost > 0 THEN
        v_refund_for_log := ROUND(v_cost);
      ELSE
        v_refund_for_log := 0;
      END IF;

      INSERT INTO partner.supplier_order_cost_log (
        order_list_id,
        supply_id,
        id_order,
        import_cost,
        refund_amount,
        ncc_payment_status
      )
      VALUES (
        NEW.id,
        NEW.supply_id,
        COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
        v_cost,
        v_refund_for_log,
        v_chua_tt_ncc
      );
      RETURN NEW;
    END IF;

    IF (NEW.status IS NOT DISTINCT FROM v_processing OR NEW.status IS NOT DISTINCT FROM v_paid)
       AND v_latest_id IS NOT NULL
       AND OLD.status IS NOT DISTINCT FROM NEW.status
       AND (
        NEW.cost IS DISTINCT FROM OLD.cost
        OR NEW.supply_id IS DISTINCT FROM OLD.supply_id
        OR NEW.refund IS DISTINCT FROM OLD.refund
        OR NEW.id_order IS DISTINCT FROM OLD.id_order
      )
    THEN
      UPDATE partner.supplier_order_cost_log l
      SET
        supply_id = NEW.supply_id,
        id_order = COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
        import_cost = v_cost,
        refund_amount = v_refund,
        logged_at = CASE WHEN v_is_mavn THEN l.logged_at ELSE NOW() END
      WHERE l.id = v_latest_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION partner.fn_supplier_order_cost_log_refund_note_only() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.refund_amount := ABS(COALESCE(NEW.refund_amount, 0));
  IF COALESCE(NEW.refund_amount, 0) > 0 THEN
    NEW.import_cost := 0;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION product.refresh_product_sold_30d() RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW CONCURRENTLY product.product_sold_30d;
    END;
    $$;

CREATE FUNCTION product.refresh_sales_summary(days_back integer DEFAULT 30) RETURNS TABLE(summary_date date, total_orders bigint, total_revenue numeric, message text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    CURRENT_DATE as summary_date,
    0::BIGINT as total_orders,
    0::NUMERIC as total_revenue,
    'Sales summary refresh function - to be implemented' as message;
END;
$$;

CREATE FUNCTION product.refresh_variant_sold_count() RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW CONCURRENTLY product.variant_sold_count;
      REFRESH MATERIALIZED VIEW CONCURRENTLY product.product_sold_count;
    END;
    $$;

CREATE FUNCTION receipt.fn_recompute_refund_credit_note_balance(p_credit_note_id bigint) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_status TEXT;
  v_refund_amount NUMERIC(18,2) := 0;
  v_applied_amount NUMERIC(18,2) := 0;
  v_available_amount NUMERIC(18,2) := 0;
  v_new_status TEXT := 'OPEN';
BEGIN
  SELECT UPPER(TRIM(COALESCE(status::text, '')))
  INTO v_status
  FROM receipt.refund_credit_notes
  WHERE id = p_credit_note_id;

  IF v_status = 'VOID' THEN
    RETURN;
  END IF;

  SELECT COALESCE(refund_amount, 0)
  INTO v_refund_amount
  FROM receipt.refund_credit_notes
  WHERE id = p_credit_note_id;

  SELECT COALESCE(SUM(applied_amount), 0)
  INTO v_applied_amount
  FROM receipt.refund_credit_applications
  WHERE credit_note_id = p_credit_note_id;

  v_available_amount := GREATEST(0, v_refund_amount - v_applied_amount);

  IF v_available_amount <= 0 THEN
    v_new_status := 'FULLY_APPLIED';
  ELSIF v_applied_amount > 0 THEN
    v_new_status := 'PARTIALLY_APPLIED';
  ELSE
    v_new_status := 'OPEN';
  END IF;

  UPDATE receipt.refund_credit_notes
  SET
    available_amount = v_available_amount,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_credit_note_id
    AND UPPER(TRIM(COALESCE(status::text, ''))) <> 'VOID';
END;
$$;

CREATE FUNCTION receipt.fn_refund_credit_applications_after_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM receipt.fn_recompute_refund_credit_note_balance(OLD.credit_note_id);
    RETURN OLD;
  END IF;

  PERFORM receipt.fn_recompute_refund_credit_note_balance(NEW.credit_note_id);

  IF TG_OP = 'UPDATE' AND OLD.credit_note_id IS DISTINCT FROM NEW.credit_note_id THEN
    PERFORM receipt.fn_recompute_refund_credit_note_balance(OLD.credit_note_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION receipt.fn_refund_credit_notes_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE FUNCTION receipt.fn_touch_payment_receipt_batch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE FUNCTION system_automation.order_list_keys_enforce_from_order() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_exp DATE;
  v_code VARCHAR(50);
BEGIN
  SELECT o.expired_at, o.id_order INTO v_exp, v_code
  FROM orders.order_list o
  WHERE o.id = NEW.order_list_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_list_id % không tồn tại trong orders.order_list', NEW.order_list_id;
  END IF;

  NEW.expires_at := v_exp;
  NEW.id_order := COALESCE(NULLIF(TRIM(v_code), ''), NULLIF(TRIM(NEW.id_order), ''));
  IF NEW.id_order IS NULL THEN
    RAISE EXCEPTION 'order_list_id %: id_order trống trên order_list', NEW.order_list_id;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE FUNCTION system_automation.sync_order_list_keys_after_order_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE system_automation.order_list_keys k
  SET
    id_order = NEW.id_order,
    expires_at = NEW.expired_at,
    updated_at = NOW()
  WHERE k.order_list_id = NEW.id;
  RETURN NEW;
END;
$$;

SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE admin.ip_whitelist (
    id integer NOT NULL,
    ip_address character varying(45) NOT NULL,
    label character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE SEQUENCE admin.ip_whitelist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE admin.ip_whitelist_id_seq OWNED BY admin.ip_whitelist.id;

CREATE TABLE admin.site_settings (
    key character varying(50) NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE admin.users (
    userid integer NOT NULL,
    username character varying(50) NOT NULL,
    passwordhash text NOT NULL,
    role character varying(20) NOT NULL,
    createdat timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE admin.users ALTER COLUMN userid ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME admin.users_userid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE cart.cart_items (
    id integer NOT NULL,
    account_id integer NOT NULL,
    variant_id integer NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    extra_info jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    price_type character varying(20) DEFAULT 'retail'::character varying NOT NULL,
    CONSTRAINT cart_items_price_type_check CHECK (((price_type)::text = ANY (ARRAY[('retail'::character varying)::text, ('promo'::character varying)::text, ('ctv'::character varying)::text])))
);

ALTER TABLE cart.cart_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME cart.cart_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE content.article_categories (
    id integer NOT NULL,
    name character varying(120) NOT NULL,
    slug character varying(120) NOT NULL,
    description text DEFAULT ''::text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE content.article_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE content.article_categories_id_seq OWNED BY content.article_categories.id;

CREATE TABLE content.articles (
    id integer NOT NULL,
    category_id integer,
    title character varying(500) NOT NULL,
    slug character varying(500) NOT NULL,
    summary text DEFAULT ''::text,
    content text DEFAULT ''::text,
    image_url text DEFAULT ''::text,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT articles_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('published'::character varying)::text])))
);

CREATE SEQUENCE content.articles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE content.articles_id_seq OWNED BY content.articles.id;

CREATE TABLE content.banners (
    id integer NOT NULL,
    image_url text DEFAULT ''::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    title character varying(500) DEFAULT ''::character varying NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    tag_text character varying(120) DEFAULT ''::character varying NOT NULL,
    image_alt character varying(500) DEFAULT ''::character varying NOT NULL,
    button_label character varying(200),
    button_href text
);

CREATE SEQUENCE content.banners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE content.banners_id_seq OWNED BY content.banners.id;

CREATE TABLE customer_web.accounts (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    username character varying(50),
    suspended_until timestamp with time zone,
    ban_reason text,
    updated_at timestamp with time zone,
    role_id bigint
);

CREATE SEQUENCE customer_web.accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE customer_web.accounts_id_seq OWNED BY customer_web.accounts.id;

CREATE TABLE customer_web.audit_logs (
    id bigint NOT NULL,
    user_id integer,
    action character varying(50) NOT NULL,
    resource_type character varying(50),
    resource_id character varying(100),
    ip_address character varying(45),
    user_agent character varying(500),
    details jsonb,
    status character varying(20) DEFAULT 'success'::character varying,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE customer_web.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE customer_web.audit_logs_id_seq OWNED BY customer_web.audit_logs.id;

CREATE TABLE customer_web.customer_profiles (
    id bigint NOT NULL,
    account_id bigint NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    date_of_birth date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tier_id bigint DEFAULT 1,
    date_of_birth_changed_at timestamp with time zone
);

CREATE SEQUENCE customer_web.customer_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE customer_web.customer_profiles_id_seq OWNED BY customer_web.customer_profiles.id;

CREATE TABLE customer_web.customer_spend_stats (
    account_id bigint NOT NULL,
    lifetime_spend numeric(18,2) DEFAULT 0,
    spend_6m numeric(18,2) DEFAULT 0,
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE customer_web.customer_tiers (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    min_total_spend numeric(18,2) NOT NULL
);

CREATE SEQUENCE customer_web.customer_tiers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE customer_web.customer_tiers_id_seq OWNED BY customer_web.customer_tiers.id;

CREATE TABLE customer_web.customer_type_history (
    id bigint NOT NULL,
    account_id bigint NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    previous_type character varying(50),
    new_type character varying(50) NOT NULL,
    total_spend numeric(18,2) DEFAULT 0 NOT NULL,
    evaluated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_period CHECK ((period_start <= period_end))
);

CREATE SEQUENCE customer_web.customer_type_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE customer_web.customer_type_history_id_seq OWNED BY customer_web.customer_type_history.id;

CREATE TABLE customer_web.password_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE customer_web.password_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE customer_web.password_history_id_seq OWNED BY customer_web.password_history.id;

CREATE TABLE customer_web.refresh_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token_hash character varying(255) NOT NULL,
    device_info character varying(255),
    ip_address character varying(45),
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    revoked_at timestamp without time zone
);

CREATE SEQUENCE customer_web.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE customer_web.refresh_tokens_id_seq OWNED BY customer_web.refresh_tokens.id;

CREATE TABLE customer_web.roles (
    id bigint NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL
);

CREATE SEQUENCE customer_web.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE customer_web.roles_id_seq OWNED BY customer_web.roles.id;

CREATE TABLE customer_web.tier_cycles (
    id bigint NOT NULL,
    cycle_start_at timestamp without time zone NOT NULL,
    cycle_end_at timestamp without time zone NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_tier_cycles_status CHECK ((status = ANY (ARRAY['OPEN'::text, 'CLOSED'::text]))),
    CONSTRAINT chk_tier_cycles_time CHECK ((cycle_end_at > cycle_start_at))
);

CREATE SEQUENCE customer_web.tier_cycles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE customer_web.tier_cycles_id_seq OWNED BY customer_web.tier_cycles.id;

CREATE TABLE dashboard.dashboard_monthly_summary (
    month_key character varying(7) NOT NULL,
    total_orders integer DEFAULT 0 NOT NULL,
    canceled_orders integer DEFAULT 0 NOT NULL,
    total_revenue numeric(18,2) DEFAULT 0 NOT NULL,
    total_profit numeric(18,2) DEFAULT 0 NOT NULL,
    total_refund numeric(18,2) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    total_import numeric(18,2) DEFAULT 0 NOT NULL,
    total_tax numeric(18,2) DEFAULT 0 NOT NULL,
    CONSTRAINT dashboard_monthly_summary_month_key_format CHECK (((month_key)::text ~ '^[0-9]{4}-[0-9]{2}$'::text))
);

CREATE TABLE dashboard.master_wallettypes (
    id integer NOT NULL,
    wallet_name character varying(100) NOT NULL,
    note text,
    asset_code character varying(10) DEFAULT 'VND'::character varying,
    is_investment boolean DEFAULT false,
    linked_wallet_id integer,
    balance_scope character varying(20) DEFAULT 'per_row'::character varying NOT NULL,
    CONSTRAINT master_wallettypes_balance_scope_check CHECK (((balance_scope)::text = ANY (ARRAY[('per_row'::character varying)::text, ('column_total'::character varying)::text])))
);

CREATE SEQUENCE dashboard.master_wallettypes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE dashboard.master_wallettypes_id_seq OWNED BY dashboard.master_wallettypes.id;

CREATE TABLE dashboard.saving_goals (
    id integer NOT NULL,
    goal_name character varying(255) NOT NULL,
    target_amount bigint NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    priority integer DEFAULT 1,
    CONSTRAINT saving_goals_target_amount_check CHECK ((target_amount > 0))
);

CREATE SEQUENCE dashboard.saving_goals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE dashboard.saving_goals_id_seq OWNED BY dashboard.saving_goals.id;

CREATE TABLE dashboard.store_profit_expenses (
    id bigint NOT NULL,
    amount numeric(18,2) NOT NULL,
    reason text,
    expense_type character varying(30) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_profit_expenses_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT store_profit_expenses_expense_type_check CHECK (((expense_type)::text = ANY (ARRAY[('withdraw_profit'::character varying)::text, ('external_import'::character varying)::text])))
);

CREATE SEQUENCE dashboard.store_profit_expenses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE dashboard.store_profit_expenses_id_seq OWNED BY dashboard.store_profit_expenses.id;

CREATE TABLE dashboard.trans_dailybalances (
    id bigint NOT NULL,
    record_date date NOT NULL,
    wallet_id integer NOT NULL,
    amount numeric(19,6) NOT NULL
);

CREATE SEQUENCE dashboard.trans_dailybalances_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE dashboard.trans_dailybalances_id_seq OWNED BY dashboard.trans_dailybalances.id;

CREATE TABLE form_desc.form_input (
    id bigint NOT NULL,
    form_id bigint NOT NULL,
    input_id bigint NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);

CREATE SEQUENCE form_desc.form_input_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE form_desc.form_input_id_seq OWNED BY form_desc.form_input.id;

CREATE TABLE form_desc.form_name (
    id bigint NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE form_desc.form_name_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE form_desc.form_name_id_seq OWNED BY form_desc.form_name.id;

CREATE TABLE form_desc.inputs (
    id bigint NOT NULL,
    input_name character varying(150) NOT NULL,
    input_type character varying(30) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE form_desc.inputs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE form_desc.inputs_id_seq OWNED BY form_desc.inputs.id;

CREATE TABLE orders.order_customer (
    id_order text NOT NULL,
    account_id integer NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_id bigint
);

CREATE SEQUENCE public.orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE orders.order_list (
    id integer DEFAULT nextval('public.orders_id_seq'::regclass) NOT NULL,
    id_order text,
    id_product integer,
    information_order text,
    customer text,
    contact text,
    slot text,
    order_date date,
    days text,
    expired_at date,
    supply_id integer,
    cost integer,
    price integer,
    note text,
    status text,
    refund numeric,
    canceled_at timestamp with time zone,
    gross_selling_price numeric(18,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_list_gross_selling_price_check CHECK (((gross_selling_price IS NULL) OR (gross_selling_price >= (0)::numeric)))
);

CREATE SEQUENCE partner.supplier_payments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE partner.supplier_payments (
    id integer DEFAULT nextval('partner.supplier_payments_id_seq'::regclass) NOT NULL,
    supplier_id integer,
    payment_period text,
    payment_status text,
    amount_paid integer
);

CREATE SEQUENCE partner.payment_supply_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE partner.payment_supply_id_seq OWNED BY partner.supplier_payments.id;

CREATE SEQUENCE product.supplier_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE partner.supplier (
    supplier_name text,
    id integer DEFAULT nextval('product.supplier_id_seq'::regclass) NOT NULL,
    number_bank text,
    bin_bank text,
    active_supply boolean
);

CREATE TABLE partner.supplier_order_cost_log (
    id bigint NOT NULL,
    order_list_id integer NOT NULL,
    supply_id integer NOT NULL,
    id_order character varying(100) NOT NULL,
    import_cost numeric(18,2) DEFAULT 0 NOT NULL,
    refund_amount numeric(18,2) DEFAULT 0 NOT NULL,
    logged_at timestamp with time zone DEFAULT now() NOT NULL,
    ncc_payment_status character varying(40) DEFAULT 'Chưa Thanh Toán'::character varying NOT NULL
);

CREATE SEQUENCE partner.supplier_order_cost_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE partner.supplier_order_cost_log_id_seq OWNED BY partner.supplier_order_cost_log.id;

CREATE SEQUENCE product.category_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE product.category (
    id integer DEFAULT nextval('product.category_id_seq'::regclass) NOT NULL,
    name character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    color text
);

CREATE TABLE product.desc_variant (
    id bigint NOT NULL,
    rules text,
    description text,
    short_desc text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE product.desc_variant_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE product.desc_variant_id_seq OWNED BY product.desc_variant.id;

CREATE SEQUENCE product.product_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE product.product (
    id integer DEFAULT nextval('product.product_id_seq'::regclass) NOT NULL,
    image_url character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT now() NOT NULL,
    package_name text
);

CREATE SEQUENCE product.package_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE product.package_id_seq OWNED BY product.product.id;

CREATE TABLE product.package_product (
    id integer NOT NULL,
    package_id integer,
    supplier text,
    cost integer,
    slot integer,
    match text,
    stock_id bigint,
    storage_id bigint,
    storage_total integer
);

CREATE SEQUENCE product.package_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE product.package_product_id_seq OWNED BY product.package_product.id;

CREATE TABLE product.pricing_tier (
    id integer NOT NULL,
    key character varying(30) NOT NULL,
    prefix character varying(10) NOT NULL,
    label character varying(100) NOT NULL,
    pricing_rule character varying(20) NOT NULL,
    base_tier_key character varying(30),
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT pricing_tier_pricing_rule_check CHECK (((pricing_rule)::text = ANY (ARRAY[('markup'::character varying)::text, ('discount'::character varying)::text, ('fixed_zero'::character varying)::text, ('cost'::character varying)::text])))
);

CREATE SEQUENCE product.pricing_tier_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE product.pricing_tier_id_seq OWNED BY product.pricing_tier.id;

CREATE TABLE product.product_category (
    product_id integer NOT NULL,
    category_id integer NOT NULL
);

CREATE TABLE product.variant (
    id integer NOT NULL,
    product_id integer NOT NULL,
    variant_name character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    display_name character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    form_id bigint,
    updated_at timestamp(6) without time zone DEFAULT now() NOT NULL,
    base_price bigint,
    image_url text,
    id_desc bigint
);

CREATE MATERIALIZED VIEW product.product_sold_30d AS
 SELECT p.id AS product_id,
    p.package_name,
    COALESCE(sold_data.sold_count_30d, 0) AS sold_count_30d,
    (COALESCE(sold_data.revenue_30d, (0)::numeric))::numeric(15,2) AS revenue_30d,
    CURRENT_TIMESTAMP AS updated_at
   FROM (product.product p
     LEFT JOIN ( SELECT v.product_id,
            (count(*))::integer AS sold_count_30d,
            (sum(COALESCE(ol.price, 0)))::numeric(15,2) AS revenue_30d
           FROM (orders.order_list ol
             JOIN product.variant v ON ((ol.id_product = v.id)))
          WHERE ((ol.id_product IS NOT NULL) AND (ol.order_date >= (CURRENT_DATE - '30 days'::interval)) AND (ol.status <> ALL (ARRAY['Đã Hủy'::text, 'Chưa Hoàn'::text, 'Đã Hoàn'::text])))
          GROUP BY v.product_id) sold_data ON ((p.id = sold_data.product_id)))
  WITH NO DATA;

CREATE MATERIALIZED VIEW product.variant_sold_count AS
 SELECT TRIM(BOTH FROM (v.display_name)::text) AS variant_display_name,
    v.id AS variant_id,
    v.product_id,
    COALESCE(order_totals.sales_count, 0) AS sales_count,
    CURRENT_TIMESTAMP AS updated_at
   FROM (product.variant v
     LEFT JOIN ( SELECT ol.id_product AS variant_id,
            (count(*))::integer AS sales_count
           FROM orders.order_list ol
          WHERE (ol.id_product IS NOT NULL)
          GROUP BY ol.id_product) order_totals ON ((order_totals.variant_id = v.id)))
  WITH NO DATA;

CREATE MATERIALIZED VIEW product.product_sold_count AS
 SELECT p.id AS product_id,
    p.package_name,
    (COALESCE(sum(vsc.sales_count), (0)::bigint))::integer AS total_sales_count,
    CURRENT_TIMESTAMP AS updated_at
   FROM (product.product p
     LEFT JOIN product.variant_sold_count vsc ON ((vsc.product_id = p.id)))
  GROUP BY p.id, p.package_name
  WITH NO DATA;

CREATE TABLE product.product_stocks (
    id bigint NOT NULL,
    product_type character varying(100) NOT NULL,
    account_username character varying(255) NOT NULL,
    backup_email character varying(255),
    password_encrypted text,
    two_fa_encrypted text,
    status character varying(20) DEFAULT 'in_stock'::character varying NOT NULL,
    expires_at date,
    is_verified boolean DEFAULT false NOT NULL,
    note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE product.product_stocks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE product.product_stocks_id_seq OWNED BY product.product_stocks.id;

CREATE TABLE product.productid_payment (
    product_id character varying(100) NOT NULL,
    amount integer NOT NULL,
    promotion_percent numeric(5,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true
);

CREATE TABLE product.reviews (
    id integer NOT NULL,
    account_id integer NOT NULL,
    product_id integer NOT NULL,
    rating integer,
    comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

CREATE SEQUENCE product.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE product.reviews_id_seq OWNED BY product.reviews.id;

CREATE SEQUENCE public.supplier_cost_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE product.supplier_cost (
    id integer DEFAULT nextval('public.supplier_cost_id_seq'::regclass) NOT NULL,
    variant_id integer,
    supplier_id integer,
    price numeric(15,2),
    created_at timestamp(6) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE product.variant_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE product.variant_id_seq OWNED BY product.variant.id;

CREATE TABLE product.variant_margin (
    variant_id integer NOT NULL,
    tier_id integer NOT NULL,
    margin_ratio numeric(12,6)
);

CREATE TABLE product.variant_sales_summary (
    id integer NOT NULL,
    variant_id character varying(255) NOT NULL,
    product_id character varying(255) NOT NULL,
    summary_date date NOT NULL,
    total_orders integer DEFAULT 0,
    total_quantity integer DEFAULT 0,
    total_revenue numeric(12,2) DEFAULT 0,
    total_cost numeric(12,2) DEFAULT 0,
    total_profit numeric(12,2) DEFAULT 0,
    updated_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE product.variant_sales_summary_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE product.variant_sales_summary_id_seq OWNED BY product.variant_sales_summary.id;

CREATE TABLE promotion.account_promotions (
    id bigint NOT NULL,
    account_id bigint NOT NULL,
    promotion_id bigint NOT NULL,
    status character varying(20) DEFAULT 'available'::character varying,
    assigned_at timestamp without time zone DEFAULT now(),
    used_at timestamp without time zone,
    usage_limit_per_user integer DEFAULT 1
);

CREATE SEQUENCE promotion.account_promotions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE promotion.account_promotions_id_seq OWNED BY promotion.account_promotions.id;

CREATE TABLE promotion.promotion_codes (
    id bigint NOT NULL,
    code character varying(50) NOT NULL,
    discount_percent numeric(5,2) NOT NULL,
    max_discount_amount numeric(12,2),
    min_order_amount numeric(12,2),
    description text,
    status character varying(20) DEFAULT 'active'::character varying,
    is_public boolean DEFAULT true,
    usage_limit integer,
    used_count integer DEFAULT 0,
    start_at timestamp without time zone,
    end_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE promotion.promotion_codes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE promotion.promotion_codes_id_seq OWNED BY promotion.promotion_codes.id;

CREATE SEQUENCE public.order_canceled_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.order_expired_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.product_desc_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE receipt.payment_receipt (
    id integer NOT NULL,
    id_order text,
    payment_date date,
    amount integer,
    receiver text,
    note text,
    sender text,
    sepay_transaction_id bigint,
    reference_code character varying(255),
    transfer_type character varying(16),
    gateway character varying(100)
);

CREATE TABLE receipt.payment_receipt_batch (
    id bigint NOT NULL,
    batch_code text NOT NULL,
    total_amount numeric(18,2) DEFAULT 0 NOT NULL,
    order_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    source text DEFAULT 'invoices'::text NOT NULL,
    note text,
    paid_receipt_id bigint,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE receipt.payment_receipt_batch_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE receipt.payment_receipt_batch_id_seq OWNED BY receipt.payment_receipt_batch.id;

CREATE TABLE receipt.payment_receipt_batch_item (
    id bigint NOT NULL,
    batch_id bigint NOT NULL,
    batch_code text NOT NULL,
    order_code text NOT NULL,
    order_list_id bigint,
    amount numeric(18,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE receipt.payment_receipt_batch_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE receipt.payment_receipt_batch_item_id_seq OWNED BY receipt.payment_receipt_batch_item.id;

CREATE TABLE receipt.payment_receipt_financial_audit_log (
    id bigint NOT NULL,
    payment_receipt_id bigint NOT NULL,
    order_code text DEFAULT ''::text NOT NULL,
    rule_branch text NOT NULL,
    delta jsonb DEFAULT '{}'::jsonb NOT NULL,
    source text DEFAULT 'webhook'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE receipt.payment_receipt_financial_audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE receipt.payment_receipt_financial_audit_log_id_seq OWNED BY receipt.payment_receipt_financial_audit_log.id;

CREATE TABLE receipt.payment_receipt_financial_state (
    id bigint NOT NULL,
    payment_receipt_id bigint NOT NULL,
    is_financial_posted boolean DEFAULT false NOT NULL,
    posted_revenue numeric(18,2) DEFAULT 0 NOT NULL,
    posted_profit numeric(18,2) DEFAULT 0 NOT NULL,
    reconciled_at timestamp with time zone,
    adjustment_applied boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE receipt.payment_receipt_financial_state_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE receipt.payment_receipt_financial_state_id_seq OWNED BY receipt.payment_receipt_financial_state.id;

CREATE SEQUENCE receipt.payment_receipt_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE receipt.payment_receipt_id_seq OWNED BY receipt.payment_receipt.id;

CREATE TABLE receipt.refund_credit_applications (
    id bigint NOT NULL,
    credit_note_id bigint NOT NULL,
    target_order_list_id integer,
    target_order_code character varying(100) NOT NULL,
    payment_receipt_id bigint,
    applied_amount numeric(18,2) NOT NULL,
    note text,
    applied_by character varying(120),
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT refund_credit_applications_applied_amount_check CHECK ((applied_amount > (0)::numeric))
);

CREATE SEQUENCE receipt.refund_credit_applications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE receipt.refund_credit_applications_id_seq OWNED BY receipt.refund_credit_applications.id;

CREATE TABLE receipt.refund_credit_notes (
    id bigint NOT NULL,
    credit_code character varying(80) NOT NULL,
    source_order_list_id integer,
    source_order_code character varying(100) NOT NULL,
    customer_name character varying(255),
    customer_contact character varying(255),
    refund_amount numeric(18,2) DEFAULT 0 NOT NULL,
    available_amount numeric(18,2) DEFAULT 0 NOT NULL,
    status character varying(40) DEFAULT 'OPEN'::character varying NOT NULL,
    note text,
    issued_at date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    split_from_note_id bigint,
    succeeded_by_note_id bigint,
    CONSTRAINT refund_credit_notes_available_amount_check CHECK ((available_amount >= (0)::numeric)),
    CONSTRAINT refund_credit_notes_available_lte_refund_ck CHECK ((available_amount <= refund_amount)),
    CONSTRAINT refund_credit_notes_refund_amount_check CHECK ((refund_amount >= (0)::numeric)),
    CONSTRAINT refund_credit_notes_status_ck CHECK (((status)::text = ANY (ARRAY[('OPEN'::character varying)::text, ('PARTIALLY_APPLIED'::character varying)::text, ('FULLY_APPLIED'::character varying)::text, ('VOID'::character varying)::text])))
);

CREATE SEQUENCE receipt.refund_credit_notes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE receipt.refund_credit_notes_id_seq OWNED BY receipt.refund_credit_notes.id;

CREATE TABLE system_automation.accounts_admin (
    id integer NOT NULL,
    email text NOT NULL,
    password_encrypted text NOT NULL,
    org_name text,
    license_status text DEFAULT 'unknown'::text,
    user_count integer DEFAULT 0,
    cookie_config jsonb,
    last_checked_at timestamp without time zone,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    mail_backup_id bigint,
    access_url text,
    otp_source text DEFAULT 'imap'::text,
    id_product text,
    users_snapshot text,
    CONSTRAINT accounts_admin_otp_source_check CHECK ((otp_source = ANY (ARRAY['imap'::text, 'tinyhost'::text, 'hdsd'::text])))
);

CREATE SEQUENCE system_automation.accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE system_automation.accounts_id_seq OWNED BY system_automation.accounts_admin.id;

CREATE TABLE system_automation.mail_backup (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    app_password character varying(255) NOT NULL,
    note text,
    provider character varying(50) DEFAULT 'gmail'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    alias_prefix character varying(255)
);

CREATE SEQUENCE system_automation.mail_backup_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE system_automation.mail_backup_id_seq OWNED BY system_automation.mail_backup.id;

CREATE TABLE system_automation.order_list_keys (
    id bigint NOT NULL,
    order_list_id integer NOT NULL,
    id_order character varying(50) NOT NULL,
    key_hash text NOT NULL,
    key_hint character varying(16),
    expires_at date,
    system_code character varying(64),
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE system_automation.order_list_keys_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE system_automation.order_list_keys_id_seq OWNED BY system_automation.order_list_keys.id;

CREATE TABLE system_automation.order_user_tracking (
    id bigint NOT NULL,
    order_id text NOT NULL,
    customer text,
    account text,
    org_name text,
    expired date,
    status text DEFAULT 'chưa add'::text NOT NULL,
    update_at timestamp with time zone DEFAULT now() NOT NULL,
    id_product text,
    CONSTRAINT order_user_tracking_status_check CHECK ((status = ANY (ARRAY['có gói'::text, 'chưa cấp quyền'::text, 'chưa add'::text])))
);

CREATE SEQUENCE system_automation.order_user_tracking_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE system_automation.order_user_tracking_id_seq OWNED BY system_automation.order_user_tracking.id;

CREATE TABLE system_automation.product_system (
    id integer NOT NULL,
    variant_id integer NOT NULL,
    system_code character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE system_automation.product_system_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE system_automation.product_system_id_seq OWNED BY system_automation.product_system.id;

CREATE TABLE system_automation.systems (
    system_code character varying(64) NOT NULL,
    system_name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE system_automation.user_account_mapping (
    id integer NOT NULL,
    user_email text NOT NULL,
    id_order text NOT NULL,
    adobe_account_id integer,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    product boolean DEFAULT false NOT NULL,
    url_active text
);

CREATE SEQUENCE system_automation.user_account_mapping_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE system_automation.user_account_mapping_id_seq OWNED BY system_automation.user_account_mapping.id;

CREATE TABLE wallet.wallet_transactions (
    id bigint NOT NULL,
    transaction_id character varying(50) NOT NULL,
    account_id integer NOT NULL,
    type character varying(20) NOT NULL,
    direction character varying(10) NOT NULL,
    amount bigint NOT NULL,
    balance_before bigint NOT NULL,
    balance_after bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    method character varying(20),
    promotion_id bigint,
    bonus_applied bigint DEFAULT 0,
    CONSTRAINT chk_wallet_direction CHECK (((direction)::text = ANY (ARRAY[('CREDIT'::character varying)::text, ('DEBIT'::character varying)::text])))
);

CREATE SEQUENCE wallet.wallet_transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE wallet.wallet_transactions_id_seq OWNED BY wallet.wallet_transactions.id;

CREATE TABLE wallet.wallets (
    account_id integer NOT NULL,
    balance bigint DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY admin.ip_whitelist ALTER COLUMN id SET DEFAULT nextval('admin.ip_whitelist_id_seq'::regclass);

ALTER TABLE ONLY content.article_categories ALTER COLUMN id SET DEFAULT nextval('content.article_categories_id_seq'::regclass);

ALTER TABLE ONLY content.articles ALTER COLUMN id SET DEFAULT nextval('content.articles_id_seq'::regclass);

ALTER TABLE ONLY content.banners ALTER COLUMN id SET DEFAULT nextval('content.banners_id_seq'::regclass);

ALTER TABLE ONLY customer_web.accounts ALTER COLUMN id SET DEFAULT nextval('customer_web.accounts_id_seq'::regclass);

ALTER TABLE ONLY customer_web.audit_logs ALTER COLUMN id SET DEFAULT nextval('customer_web.audit_logs_id_seq'::regclass);

ALTER TABLE ONLY customer_web.customer_profiles ALTER COLUMN id SET DEFAULT nextval('customer_web.customer_profiles_id_seq'::regclass);

ALTER TABLE ONLY customer_web.customer_tiers ALTER COLUMN id SET DEFAULT nextval('customer_web.customer_tiers_id_seq'::regclass);

ALTER TABLE ONLY customer_web.customer_type_history ALTER COLUMN id SET DEFAULT nextval('customer_web.customer_type_history_id_seq'::regclass);

ALTER TABLE ONLY customer_web.password_history ALTER COLUMN id SET DEFAULT nextval('customer_web.password_history_id_seq'::regclass);

ALTER TABLE ONLY customer_web.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('customer_web.refresh_tokens_id_seq'::regclass);

ALTER TABLE ONLY customer_web.roles ALTER COLUMN id SET DEFAULT nextval('customer_web.roles_id_seq'::regclass);

ALTER TABLE ONLY customer_web.tier_cycles ALTER COLUMN id SET DEFAULT nextval('customer_web.tier_cycles_id_seq'::regclass);

ALTER TABLE ONLY dashboard.master_wallettypes ALTER COLUMN id SET DEFAULT nextval('dashboard.master_wallettypes_id_seq'::regclass);

ALTER TABLE ONLY dashboard.saving_goals ALTER COLUMN id SET DEFAULT nextval('dashboard.saving_goals_id_seq'::regclass);

ALTER TABLE ONLY dashboard.store_profit_expenses ALTER COLUMN id SET DEFAULT nextval('dashboard.store_profit_expenses_id_seq'::regclass);

ALTER TABLE ONLY dashboard.trans_dailybalances ALTER COLUMN id SET DEFAULT nextval('dashboard.trans_dailybalances_id_seq'::regclass);

ALTER TABLE ONLY form_desc.form_input ALTER COLUMN id SET DEFAULT nextval('form_desc.form_input_id_seq'::regclass);

ALTER TABLE ONLY form_desc.form_name ALTER COLUMN id SET DEFAULT nextval('form_desc.form_name_id_seq'::regclass);

ALTER TABLE ONLY form_desc.inputs ALTER COLUMN id SET DEFAULT nextval('form_desc.inputs_id_seq'::regclass);

ALTER TABLE ONLY partner.supplier_order_cost_log ALTER COLUMN id SET DEFAULT nextval('partner.supplier_order_cost_log_id_seq'::regclass);

ALTER TABLE ONLY product.desc_variant ALTER COLUMN id SET DEFAULT nextval('product.desc_variant_id_seq'::regclass);

ALTER TABLE ONLY product.package_product ALTER COLUMN id SET DEFAULT nextval('product.package_product_id_seq'::regclass);

ALTER TABLE ONLY product.pricing_tier ALTER COLUMN id SET DEFAULT nextval('product.pricing_tier_id_seq'::regclass);

ALTER TABLE ONLY product.product_stocks ALTER COLUMN id SET DEFAULT nextval('product.product_stocks_id_seq'::regclass);

ALTER TABLE ONLY product.reviews ALTER COLUMN id SET DEFAULT nextval('product.reviews_id_seq'::regclass);

ALTER TABLE ONLY product.variant ALTER COLUMN id SET DEFAULT nextval('product.variant_id_seq'::regclass);

ALTER TABLE ONLY product.variant_sales_summary ALTER COLUMN id SET DEFAULT nextval('product.variant_sales_summary_id_seq'::regclass);

ALTER TABLE ONLY promotion.account_promotions ALTER COLUMN id SET DEFAULT nextval('promotion.account_promotions_id_seq'::regclass);

ALTER TABLE ONLY promotion.promotion_codes ALTER COLUMN id SET DEFAULT nextval('promotion.promotion_codes_id_seq'::regclass);

ALTER TABLE ONLY receipt.payment_receipt ALTER COLUMN id SET DEFAULT nextval('receipt.payment_receipt_id_seq'::regclass);

ALTER TABLE ONLY receipt.payment_receipt_batch ALTER COLUMN id SET DEFAULT nextval('receipt.payment_receipt_batch_id_seq'::regclass);

ALTER TABLE ONLY receipt.payment_receipt_batch_item ALTER COLUMN id SET DEFAULT nextval('receipt.payment_receipt_batch_item_id_seq'::regclass);

ALTER TABLE ONLY receipt.payment_receipt_financial_audit_log ALTER COLUMN id SET DEFAULT nextval('receipt.payment_receipt_financial_audit_log_id_seq'::regclass);

ALTER TABLE ONLY receipt.payment_receipt_financial_state ALTER COLUMN id SET DEFAULT nextval('receipt.payment_receipt_financial_state_id_seq'::regclass);

ALTER TABLE ONLY receipt.refund_credit_applications ALTER COLUMN id SET DEFAULT nextval('receipt.refund_credit_applications_id_seq'::regclass);

ALTER TABLE ONLY receipt.refund_credit_notes ALTER COLUMN id SET DEFAULT nextval('receipt.refund_credit_notes_id_seq'::regclass);

ALTER TABLE ONLY system_automation.accounts_admin ALTER COLUMN id SET DEFAULT nextval('system_automation.accounts_id_seq'::regclass);

ALTER TABLE ONLY system_automation.mail_backup ALTER COLUMN id SET DEFAULT nextval('system_automation.mail_backup_id_seq'::regclass);

ALTER TABLE ONLY system_automation.order_list_keys ALTER COLUMN id SET DEFAULT nextval('system_automation.order_list_keys_id_seq'::regclass);

ALTER TABLE ONLY system_automation.order_user_tracking ALTER COLUMN id SET DEFAULT nextval('system_automation.order_user_tracking_id_seq'::regclass);

ALTER TABLE ONLY system_automation.product_system ALTER COLUMN id SET DEFAULT nextval('system_automation.product_system_id_seq'::regclass);

ALTER TABLE ONLY system_automation.user_account_mapping ALTER COLUMN id SET DEFAULT nextval('system_automation.user_account_mapping_id_seq'::regclass);

ALTER TABLE ONLY wallet.wallet_transactions ALTER COLUMN id SET DEFAULT nextval('wallet.wallet_transactions_id_seq'::regclass);

ALTER TABLE ONLY admin.ip_whitelist
    ADD CONSTRAINT ip_whitelist_pkey PRIMARY KEY (id);

ALTER TABLE ONLY admin.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (key);

ALTER TABLE ONLY admin.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (userid);

ALTER TABLE ONLY admin.users
    ADD CONSTRAINT users_username_key UNIQUE (username);

ALTER TABLE ONLY cart.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY content.article_categories
    ADD CONSTRAINT article_categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY content.article_categories
    ADD CONSTRAINT article_categories_slug_key UNIQUE (slug);

ALTER TABLE ONLY content.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY content.articles
    ADD CONSTRAINT articles_slug_key UNIQUE (slug);

ALTER TABLE ONLY content.banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);

ALTER TABLE ONLY customer_web.accounts
    ADD CONSTRAINT accounts_email_key UNIQUE (email);

ALTER TABLE ONLY customer_web.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY customer_web.accounts
    ADD CONSTRAINT accounts_username_key UNIQUE (username);

ALTER TABLE ONLY customer_web.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY customer_web.customer_profiles
    ADD CONSTRAINT customer_profiles_account_id_key UNIQUE (account_id);

ALTER TABLE ONLY customer_web.customer_profiles
    ADD CONSTRAINT customer_profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY customer_web.customer_spend_stats
    ADD CONSTRAINT customer_spend_stats_pkey PRIMARY KEY (account_id);

ALTER TABLE ONLY customer_web.customer_tiers
    ADD CONSTRAINT customer_tiers_name_key UNIQUE (name);

ALTER TABLE ONLY customer_web.customer_tiers
    ADD CONSTRAINT customer_tiers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY customer_web.customer_type_history
    ADD CONSTRAINT customer_type_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY customer_web.password_history
    ADD CONSTRAINT password_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY customer_web.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY customer_web.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);

ALTER TABLE ONLY customer_web.roles
    ADD CONSTRAINT roles_code_key UNIQUE (code);

ALTER TABLE ONLY customer_web.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY customer_web.tier_cycles
    ADD CONSTRAINT tier_cycles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY dashboard.dashboard_monthly_summary
    ADD CONSTRAINT dashboard_monthly_summary_pkey PRIMARY KEY (month_key);

ALTER TABLE ONLY dashboard.master_wallettypes
    ADD CONSTRAINT master_wallettypes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY dashboard.saving_goals
    ADD CONSTRAINT saving_goals_pkey PRIMARY KEY (id);

ALTER TABLE ONLY dashboard.store_profit_expenses
    ADD CONSTRAINT store_profit_expenses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY dashboard.trans_dailybalances
    ADD CONSTRAINT trans_dailybalances_pkey PRIMARY KEY (id);

ALTER TABLE ONLY dashboard.trans_dailybalances
    ADD CONSTRAINT uq_date_wallet UNIQUE (record_date, wallet_id);

ALTER TABLE ONLY form_desc.form_input
    ADD CONSTRAINT form_input_pkey PRIMARY KEY (id);

ALTER TABLE ONLY form_desc.form_name
    ADD CONSTRAINT form_name_pkey PRIMARY KEY (id);

ALTER TABLE ONLY form_desc.inputs
    ADD CONSTRAINT inputs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY form_desc.form_input
    ADD CONSTRAINT uq_form_input UNIQUE (form_id, input_id);

ALTER TABLE ONLY orders.order_list
    ADD CONSTRAINT order_list_pkey PRIMARY KEY (id);

ALTER TABLE ONLY orders.order_customer
    ADD CONSTRAINT pk_order_customer PRIMARY KEY (id_order, account_id);

ALTER TABLE ONLY partner.supplier_payments
    ADD CONSTRAINT payment_supply_pkey PRIMARY KEY (id);

ALTER TABLE ONLY partner.supplier_order_cost_log
    ADD CONSTRAINT supplier_order_cost_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY partner.supplier
    ADD CONSTRAINT supplier_pkey PRIMARY KEY (id);

ALTER TABLE ONLY product.category
    ADD CONSTRAINT category_pkey PRIMARY KEY (id);

ALTER TABLE ONLY product.desc_variant
    ADD CONSTRAINT desc_variant_pkey PRIMARY KEY (id);

ALTER TABLE ONLY product.product
    ADD CONSTRAINT package_pkey PRIMARY KEY (id);

ALTER TABLE ONLY product.package_product
    ADD CONSTRAINT package_product_pkey PRIMARY KEY (id);

ALTER TABLE ONLY product.pricing_tier
    ADD CONSTRAINT pricing_tier_key_key UNIQUE (key);

ALTER TABLE ONLY product.pricing_tier
    ADD CONSTRAINT pricing_tier_pkey PRIMARY KEY (id);

ALTER TABLE ONLY product.pricing_tier
    ADD CONSTRAINT pricing_tier_prefix_key UNIQUE (prefix);

ALTER TABLE ONLY product.product_category
    ADD CONSTRAINT product_category_pkey PRIMARY KEY (product_id, category_id);

ALTER TABLE ONLY product.product_stocks
    ADD CONSTRAINT product_stocks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY product.productid_payment
    ADD CONSTRAINT productid_payment_pkey PRIMARY KEY (product_id);

ALTER TABLE ONLY product.productid_payment
    ADD CONSTRAINT productid_payment_product_id_key UNIQUE (product_id);

ALTER TABLE ONLY product.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY product.supplier_cost
    ADD CONSTRAINT supplier_cost_pkey PRIMARY KEY (id);

ALTER TABLE ONLY product.variant_margin
    ADD CONSTRAINT variant_margin_pkey PRIMARY KEY (variant_id, tier_id);

ALTER TABLE ONLY product.variant
    ADD CONSTRAINT variant_pkey PRIMARY KEY (id);

ALTER TABLE ONLY product.variant_sales_summary
    ADD CONSTRAINT variant_sales_summary_pkey PRIMARY KEY (id);

ALTER TABLE ONLY product.variant_sales_summary
    ADD CONSTRAINT variant_sales_summary_variant_id_summary_date_key UNIQUE (variant_id, summary_date);

ALTER TABLE ONLY promotion.account_promotions
    ADD CONSTRAINT account_promotions_account_id_promotion_id_key UNIQUE (account_id, promotion_id);

ALTER TABLE ONLY promotion.account_promotions
    ADD CONSTRAINT account_promotions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY promotion.promotion_codes
    ADD CONSTRAINT promotion_codes_code_key UNIQUE (code);

ALTER TABLE ONLY promotion.promotion_codes
    ADD CONSTRAINT promotion_codes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY receipt.payment_receipt_batch
    ADD CONSTRAINT payment_receipt_batch_batch_code_key UNIQUE (batch_code);

ALTER TABLE ONLY receipt.payment_receipt_batch_item
    ADD CONSTRAINT payment_receipt_batch_item_batch_id_order_code_key UNIQUE (batch_id, order_code);

ALTER TABLE ONLY receipt.payment_receipt_batch_item
    ADD CONSTRAINT payment_receipt_batch_item_pkey PRIMARY KEY (id);

ALTER TABLE ONLY receipt.payment_receipt_batch
    ADD CONSTRAINT payment_receipt_batch_pkey PRIMARY KEY (id);

ALTER TABLE ONLY receipt.payment_receipt_financial_audit_log
    ADD CONSTRAINT payment_receipt_financial_audit_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY receipt.payment_receipt_financial_state
    ADD CONSTRAINT payment_receipt_financial_state_payment_receipt_id_key UNIQUE (payment_receipt_id);

ALTER TABLE ONLY receipt.payment_receipt_financial_state
    ADD CONSTRAINT payment_receipt_financial_state_pkey PRIMARY KEY (id);

ALTER TABLE ONLY receipt.payment_receipt
    ADD CONSTRAINT payment_receipt_pkey PRIMARY KEY (id);

ALTER TABLE ONLY receipt.refund_credit_applications
    ADD CONSTRAINT refund_credit_applications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY receipt.refund_credit_notes
    ADD CONSTRAINT refund_credit_notes_credit_code_key UNIQUE (credit_code);

ALTER TABLE ONLY receipt.refund_credit_notes
    ADD CONSTRAINT refund_credit_notes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY system_automation.accounts_admin
    ADD CONSTRAINT accounts_email_key UNIQUE (email);

ALTER TABLE ONLY system_automation.accounts_admin
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY system_automation.mail_backup
    ADD CONSTRAINT mail_backup_pkey PRIMARY KEY (id);

ALTER TABLE ONLY system_automation.order_list_keys
    ADD CONSTRAINT order_list_keys_order_list_id_unique UNIQUE (order_list_id);

ALTER TABLE ONLY system_automation.order_list_keys
    ADD CONSTRAINT order_list_keys_pkey PRIMARY KEY (id);

ALTER TABLE ONLY system_automation.order_user_tracking
    ADD CONSTRAINT order_user_tracking_order_id_unique UNIQUE (order_id);

ALTER TABLE ONLY system_automation.order_user_tracking
    ADD CONSTRAINT order_user_tracking_pkey PRIMARY KEY (id);

ALTER TABLE ONLY system_automation.product_system
    ADD CONSTRAINT product_system_pkey PRIMARY KEY (id);

ALTER TABLE ONLY system_automation.product_system
    ADD CONSTRAINT product_system_variant_id_system_code_key UNIQUE (variant_id, system_code);

ALTER TABLE ONLY system_automation.systems
    ADD CONSTRAINT systems_pkey PRIMARY KEY (system_code);

ALTER TABLE ONLY system_automation.user_account_mapping
    ADD CONSTRAINT user_account_mapping_pkey PRIMARY KEY (id);

ALTER TABLE ONLY system_automation.user_account_mapping
    ADD CONSTRAINT user_account_mapping_user_email_id_order_key UNIQUE (user_email, id_order);

ALTER TABLE ONLY wallet.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY wallet.wallet_transactions
    ADD CONSTRAINT wallet_transactions_transaction_id_unique UNIQUE (transaction_id);

ALTER TABLE ONLY wallet.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (account_id);

CREATE INDEX idx_ip_whitelist_active ON admin.ip_whitelist USING btree (is_active) WHERE (is_active = true);

CREATE UNIQUE INDEX idx_ip_whitelist_ip ON admin.ip_whitelist USING btree (ip_address);

CREATE INDEX idx_cart_items_account_id ON cart.cart_items USING btree (account_id);

CREATE INDEX idx_cart_items_account_variant ON cart.cart_items USING btree (account_id, variant_id);

CREATE INDEX idx_article_categories_slug ON content.article_categories USING btree (slug);

CREATE INDEX idx_articles_category_id ON content.articles USING btree (category_id);

CREATE INDEX idx_articles_published_at ON content.articles USING btree (published_at DESC NULLS LAST);

CREATE INDEX idx_articles_slug ON content.articles USING btree (slug);

CREATE INDEX idx_articles_status ON content.articles USING btree (status);

CREATE INDEX idx_banners_active_order ON content.banners USING btree (active, sort_order);

CREATE INDEX idx_audit_action ON customer_web.audit_logs USING btree (action);

CREATE INDEX idx_audit_created ON customer_web.audit_logs USING btree (created_at);

CREATE INDEX idx_audit_user ON customer_web.audit_logs USING btree (user_id);

CREATE INDEX idx_cth_account_time ON customer_web.customer_type_history USING btree (account_id, evaluated_at DESC);

CREATE INDEX idx_customer_profiles_account_id ON customer_web.customer_profiles USING btree (account_id);

CREATE INDEX idx_customer_profiles_name ON customer_web.customer_profiles USING btree (last_name, first_name);

CREATE INDEX idx_customer_profiles_tier_id ON customer_web.customer_profiles USING btree (tier_id);

CREATE INDEX idx_password_history_user_id ON customer_web.password_history USING btree (user_id);

CREATE INDEX idx_refresh_tokens_expires ON customer_web.refresh_tokens USING btree (expires_at);

CREATE INDEX idx_refresh_tokens_user ON customer_web.refresh_tokens USING btree (user_id);

CREATE INDEX idx_tier_cycles_time_range ON customer_web.tier_cycles USING btree (cycle_start_at, cycle_end_at);

CREATE UNIQUE INDEX uq_tier_cycles_start_end ON customer_web.tier_cycles USING btree (cycle_start_at, cycle_end_at);

CREATE INDEX idx_dashboard_monthly_summary_updated_at ON dashboard.dashboard_monthly_summary USING btree (updated_at DESC);

CREATE INDEX idx_order_customer_customer ON orders.order_customer USING btree (account_id, created_at DESC);

CREATE INDEX idx_order_customer_id_order ON orders.order_customer USING btree (id_order);

CREATE INDEX idx_order_list_id_product ON orders.order_list USING btree (id_product);

CREATE INDEX idx_order_list_status ON orders.order_list USING btree (status);

CREATE INDEX idx_supplier_order_cost_log_logged_at ON partner.supplier_order_cost_log USING btree (logged_at DESC);

CREATE INDEX idx_supplier_order_cost_log_order_list_id_desc ON partner.supplier_order_cost_log USING btree (order_list_id, id DESC);

CREATE INDEX idx_supplier_order_cost_log_supply_id ON partner.supplier_order_cost_log USING btree (supply_id);

CREATE INDEX idx_product_is_active ON product.product USING btree (is_active);

CREATE UNIQUE INDEX idx_product_sold_30d_product_id ON product.product_sold_30d USING btree (product_id);

CREATE INDEX idx_product_sold_30d_revenue ON product.product_sold_30d USING btree (revenue_30d DESC);

CREATE INDEX idx_product_sold_30d_sold_count ON product.product_sold_30d USING btree (sold_count_30d DESC);

CREATE INDEX idx_product_sold_30d_updated_at ON product.product_sold_30d USING btree (updated_at DESC);

CREATE UNIQUE INDEX idx_product_sold_count_product_id ON product.product_sold_count USING btree (product_id);

CREATE INDEX idx_product_sold_count_sales ON product.product_sold_count USING btree (total_sales_count DESC);

CREATE INDEX idx_variant_margin_variant ON product.variant_margin USING btree (variant_id);

CREATE INDEX idx_variant_product_active ON product.variant USING btree (product_id, is_active);

CREATE UNIQUE INDEX idx_variant_product_display_name ON product.variant USING btree (product_id, display_name);

CREATE INDEX idx_variant_product_id ON product.variant USING btree (product_id);

CREATE INDEX idx_variant_sales_summary_date ON product.variant_sales_summary USING btree (summary_date DESC);

CREATE INDEX idx_variant_sales_summary_product ON product.variant_sales_summary USING btree (product_id);

CREATE INDEX idx_variant_sales_summary_variant ON product.variant_sales_summary USING btree (variant_id);

CREATE INDEX idx_variant_sold_count_display_name ON product.variant_sold_count USING btree (variant_display_name);

CREATE INDEX idx_variant_sold_count_product_id ON product.variant_sold_count USING btree (product_id);

CREATE INDEX idx_variant_sold_count_sales ON product.variant_sold_count USING btree (sales_count DESC);

CREATE UNIQUE INDEX idx_variant_sold_count_variant_id ON product.variant_sold_count USING btree (variant_id);

CREATE UNIQUE INDEX ux_variant_product_display_name ON product.variant USING btree (product_id, display_name);

CREATE INDEX idx_payment_receipt_fin_state_posted ON receipt.payment_receipt_financial_state USING btree (is_financial_posted);

CREATE INDEX idx_payment_receipt_reference_fallback ON receipt.payment_receipt USING btree (reference_code, transfer_type, amount, payment_date);

CREATE INDEX idx_pr_fin_audit_branch ON receipt.payment_receipt_financial_audit_log USING btree (rule_branch);

CREATE INDEX idx_pr_fin_audit_created ON receipt.payment_receipt_financial_audit_log USING btree (created_at DESC);

CREATE INDEX idx_pr_fin_audit_receipt_id ON receipt.payment_receipt_financial_audit_log USING btree (payment_receipt_id);

CREATE INDEX idx_receipt_batch_code ON receipt.payment_receipt_batch USING btree (batch_code);

CREATE INDEX idx_receipt_batch_item_batch_code ON receipt.payment_receipt_batch_item USING btree (batch_code);

CREATE INDEX idx_receipt_batch_item_order_code ON receipt.payment_receipt_batch_item USING btree (order_code);

CREATE INDEX idx_receipt_batch_status ON receipt.payment_receipt_batch USING btree (status);

CREATE INDEX idx_refund_credit_applications_credit_note ON receipt.refund_credit_applications USING btree (credit_note_id, applied_at DESC);

CREATE INDEX idx_refund_credit_applications_target_order_code ON receipt.refund_credit_applications USING btree (upper(TRIM(BOTH FROM target_order_code)));

CREATE INDEX idx_refund_credit_notes_source_order_code ON receipt.refund_credit_notes USING btree (upper(TRIM(BOTH FROM source_order_code)));

CREATE INDEX idx_refund_credit_notes_split_from ON receipt.refund_credit_notes USING btree (split_from_note_id) WHERE (split_from_note_id IS NOT NULL);

CREATE INDEX idx_refund_credit_notes_status ON receipt.refund_credit_notes USING btree (status, issued_at DESC);

CREATE INDEX idx_refund_credit_notes_succeeded_by ON receipt.refund_credit_notes USING btree (succeeded_by_note_id) WHERE (succeeded_by_note_id IS NOT NULL);

CREATE UNIQUE INDEX uq_payment_receipt_sepay_transaction_id ON receipt.payment_receipt USING btree (sepay_transaction_id) WHERE (sepay_transaction_id IS NOT NULL);

CREATE INDEX idx_order_list_keys_expires_status ON system_automation.order_list_keys USING btree (expires_at, status) WHERE ((status)::text = 'active'::text);

CREATE INDEX idx_order_list_keys_id_order_upper ON system_automation.order_list_keys USING btree (upper(TRIM(BOTH FROM id_order)));

CREATE INDEX idx_order_user_tracking_account ON system_automation.order_user_tracking USING btree (account);

CREATE INDEX idx_order_user_tracking_expired ON system_automation.order_user_tracking USING btree (expired);

CREATE INDEX idx_order_user_tracking_status ON system_automation.order_user_tracking USING btree (status);

CREATE INDEX idx_product_system_system_code ON system_automation.product_system USING btree (system_code);

CREATE INDEX idx_product_system_variant_id ON system_automation.product_system USING btree (variant_id);

CREATE INDEX idx_uam_adobe_acc ON system_automation.user_account_mapping USING btree (adobe_account_id);

CREATE INDEX idx_uam_id_order ON system_automation.user_account_mapping USING btree (id_order);

CREATE INDEX idx_uam_user_email ON system_automation.user_account_mapping USING btree (user_email);

CREATE INDEX idx_wallet_transactions_account_id ON wallet.wallet_transactions USING btree (account_id);

CREATE TRIGGER tr_order_list_keys_sync_order AFTER UPDATE OF expired_at, id_order ON orders.order_list FOR EACH ROW EXECUTE FUNCTION system_automation.sync_order_list_keys_after_order_update();

CREATE TRIGGER tr_order_list_refund_force_positive BEFORE INSERT OR UPDATE OF refund ON orders.order_list FOR EACH ROW EXECUTE FUNCTION orders.fn_order_list_refund_force_positive();

CREATE TRIGGER tr_supplier_order_cost_log_order_success AFTER INSERT OR UPDATE OF status, supply_id, cost, refund, id_order ON orders.order_list FOR EACH ROW EXECUTE FUNCTION partner.fn_supplier_order_cost_log_on_success();

CREATE TRIGGER tr_supplier_order_cost_log_refund_note_only BEFORE INSERT OR UPDATE OF import_cost, refund_amount ON partner.supplier_order_cost_log FOR EACH ROW EXECUTE FUNCTION partner.fn_supplier_order_cost_log_refund_note_only();

CREATE TRIGGER trg_supplier_order_cost_log_dashboard_import AFTER INSERT OR DELETE OR UPDATE ON partner.supplier_order_cost_log FOR EACH ROW EXECUTE FUNCTION partner.fn_recalc_dashboard_total_import();

CREATE TRIGGER tr_refund_credit_applications_after_change AFTER INSERT OR DELETE OR UPDATE ON receipt.refund_credit_applications FOR EACH ROW EXECUTE FUNCTION receipt.fn_refund_credit_applications_after_change();

CREATE TRIGGER tr_refund_credit_notes_touch_updated_at BEFORE UPDATE ON receipt.refund_credit_notes FOR EACH ROW EXECUTE FUNCTION receipt.fn_refund_credit_notes_touch_updated_at();

CREATE TRIGGER tr_touch_payment_receipt_batch_updated_at BEFORE UPDATE ON receipt.payment_receipt_batch FOR EACH ROW EXECUTE FUNCTION receipt.fn_touch_payment_receipt_batch_updated_at();

CREATE TRIGGER tr_order_list_keys_bi_enforce BEFORE INSERT OR UPDATE OF order_list_id ON system_automation.order_list_keys FOR EACH ROW EXECUTE FUNCTION system_automation.order_list_keys_enforce_from_order();

ALTER TABLE ONLY cart.cart_items
    ADD CONSTRAINT fk_cart_items_account FOREIGN KEY (account_id) REFERENCES customer_web.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY cart.cart_items
    ADD CONSTRAINT fk_cart_items_variant FOREIGN KEY (variant_id) REFERENCES product.variant(id) ON DELETE CASCADE;

ALTER TABLE ONLY content.articles
    ADD CONSTRAINT articles_category_id_fkey FOREIGN KEY (category_id) REFERENCES content.article_categories(id) ON DELETE SET NULL;

ALTER TABLE ONLY customer_web.accounts
    ADD CONSTRAINT fk_accounts_role FOREIGN KEY (role_id) REFERENCES customer_web.roles(id) ON DELETE SET NULL;

ALTER TABLE ONLY customer_web.customer_type_history
    ADD CONSTRAINT fk_cth_account FOREIGN KEY (account_id) REFERENCES customer_web.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY customer_web.customer_profiles
    ADD CONSTRAINT fk_customer_profiles_account FOREIGN KEY (account_id) REFERENCES customer_web.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY customer_web.customer_profiles
    ADD CONSTRAINT fk_customer_profiles_tier FOREIGN KEY (tier_id) REFERENCES customer_web.customer_tiers(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY customer_web.customer_spend_stats
    ADD CONSTRAINT fk_spend_stats_account FOREIGN KEY (account_id) REFERENCES customer_web.customer_profiles(account_id) ON DELETE CASCADE;

ALTER TABLE ONLY customer_web.password_history
    ADD CONSTRAINT password_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES customer_web.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY dashboard.trans_dailybalances
    ADD CONSTRAINT trans_dailybalances_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES dashboard.master_wallettypes(id);

ALTER TABLE ONLY form_desc.form_input
    ADD CONSTRAINT fk_form_input_form FOREIGN KEY (form_id) REFERENCES form_desc.form_name(id) ON DELETE RESTRICT;

ALTER TABLE ONLY form_desc.form_input
    ADD CONSTRAINT fk_form_input_input FOREIGN KEY (input_id) REFERENCES form_desc.inputs(id) ON DELETE RESTRICT;

ALTER TABLE ONLY orders.order_customer
    ADD CONSTRAINT fk_order_payment FOREIGN KEY (payment_id) REFERENCES wallet.wallet_transactions(id) ON DELETE SET NULL;

ALTER TABLE ONLY orders.order_list
    ADD CONSTRAINT fk_order_variant FOREIGN KEY (id_product) REFERENCES product.variant(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY orders.order_list
    ADD CONSTRAINT fk_supply FOREIGN KEY (supply_id) REFERENCES partner.supplier(id);

ALTER TABLE ONLY partner.supplier_order_cost_log
    ADD CONSTRAINT supplier_order_cost_log_order_list_fk FOREIGN KEY (order_list_id) REFERENCES orders.order_list(id) ON DELETE CASCADE;

ALTER TABLE ONLY product.product_category
    ADD CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES product.category(id) ON DELETE CASCADE;

ALTER TABLE ONLY product.reviews
    ADD CONSTRAINT fk_customer_account FOREIGN KEY (account_id) REFERENCES customer_web.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY product.package_product
    ADD CONSTRAINT fk_package_product_ref_product FOREIGN KEY (package_id) REFERENCES product.product(id);

ALTER TABLE ONLY product.package_product
    ADD CONSTRAINT fk_package_product_stock_id FOREIGN KEY (stock_id) REFERENCES product.product_stocks(id);

ALTER TABLE ONLY product.package_product
    ADD CONSTRAINT fk_package_product_storage_id FOREIGN KEY (storage_id) REFERENCES product.product_stocks(id);

ALTER TABLE ONLY product.product_category
    ADD CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES product.product(id) ON DELETE CASCADE;

ALTER TABLE ONLY product.variant
    ADD CONSTRAINT fk_variant_form FOREIGN KEY (form_id) REFERENCES form_desc.form_name(id) ON DELETE SET NULL;

ALTER TABLE ONLY product.variant
    ADD CONSTRAINT fk_variant_product FOREIGN KEY (product_id) REFERENCES product.product(id) ON DELETE CASCADE;

ALTER TABLE ONLY product.pricing_tier
    ADD CONSTRAINT pricing_tier_base_tier_key_fkey FOREIGN KEY (base_tier_key) REFERENCES product.pricing_tier(key);

ALTER TABLE ONLY product.variant_margin
    ADD CONSTRAINT variant_margin_tier_id_fkey FOREIGN KEY (tier_id) REFERENCES product.pricing_tier(id) ON DELETE CASCADE;

ALTER TABLE ONLY product.variant_margin
    ADD CONSTRAINT variant_margin_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES product.variant(id) ON DELETE CASCADE;

ALTER TABLE ONLY promotion.account_promotions
    ADD CONSTRAINT account_promotions_account_id_fkey FOREIGN KEY (account_id) REFERENCES customer_web.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY promotion.account_promotions
    ADD CONSTRAINT account_promotions_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES promotion.promotion_codes(id) ON DELETE CASCADE;

ALTER TABLE ONLY receipt.payment_receipt_batch_item
    ADD CONSTRAINT payment_receipt_batch_item_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES receipt.payment_receipt_batch(id) ON DELETE CASCADE;

ALTER TABLE ONLY receipt.payment_receipt_batch
    ADD CONSTRAINT payment_receipt_batch_paid_receipt_id_fkey FOREIGN KEY (paid_receipt_id) REFERENCES receipt.payment_receipt(id) ON DELETE SET NULL;

ALTER TABLE ONLY receipt.payment_receipt_financial_audit_log
    ADD CONSTRAINT payment_receipt_financial_audit_log_payment_receipt_id_fkey FOREIGN KEY (payment_receipt_id) REFERENCES receipt.payment_receipt(id) ON DELETE CASCADE;

ALTER TABLE ONLY receipt.payment_receipt_financial_state
    ADD CONSTRAINT payment_receipt_financial_state_payment_receipt_id_fkey FOREIGN KEY (payment_receipt_id) REFERENCES receipt.payment_receipt(id) ON DELETE CASCADE;

ALTER TABLE ONLY receipt.refund_credit_applications
    ADD CONSTRAINT refund_credit_applications_credit_note_id_fkey FOREIGN KEY (credit_note_id) REFERENCES receipt.refund_credit_notes(id) ON DELETE CASCADE;

ALTER TABLE ONLY receipt.refund_credit_applications
    ADD CONSTRAINT refund_credit_applications_payment_receipt_id_fkey FOREIGN KEY (payment_receipt_id) REFERENCES receipt.payment_receipt(id) ON DELETE SET NULL;

ALTER TABLE ONLY receipt.refund_credit_applications
    ADD CONSTRAINT refund_credit_applications_target_order_list_id_fkey FOREIGN KEY (target_order_list_id) REFERENCES orders.order_list(id) ON DELETE SET NULL;

ALTER TABLE ONLY receipt.refund_credit_notes
    ADD CONSTRAINT refund_credit_notes_source_order_list_id_fkey FOREIGN KEY (source_order_list_id) REFERENCES orders.order_list(id) ON DELETE SET NULL;

ALTER TABLE ONLY receipt.refund_credit_notes
    ADD CONSTRAINT refund_credit_notes_split_from_note_id_fkey FOREIGN KEY (split_from_note_id) REFERENCES receipt.refund_credit_notes(id) ON DELETE SET NULL;

ALTER TABLE ONLY receipt.refund_credit_notes
    ADD CONSTRAINT refund_credit_notes_succeeded_by_note_id_fkey FOREIGN KEY (succeeded_by_note_id) REFERENCES receipt.refund_credit_notes(id) ON DELETE SET NULL;

ALTER TABLE ONLY system_automation.accounts_admin
    ADD CONSTRAINT fk_accounts_mail_backup FOREIGN KEY (mail_backup_id) REFERENCES system_automation.mail_backup(id);

ALTER TABLE ONLY system_automation.order_list_keys
    ADD CONSTRAINT order_list_keys_order_list_id_fk FOREIGN KEY (order_list_id) REFERENCES orders.order_list(id) ON DELETE CASCADE;

ALTER TABLE ONLY system_automation.order_list_keys
    ADD CONSTRAINT order_list_keys_system_code_fk FOREIGN KEY (system_code) REFERENCES system_automation.systems(system_code) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY wallet.wallet_transactions
    ADD CONSTRAINT fk_wallet_tx_promotion FOREIGN KEY (promotion_id) REFERENCES promotion.promotion_codes(id) ON DELETE SET NULL;

ALTER TABLE ONLY wallet.wallets
    ADD CONSTRAINT fk_wallets_account FOREIGN KEY (account_id) REFERENCES customer_web.accounts(id) ON DELETE CASCADE;
