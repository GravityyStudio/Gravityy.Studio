// Generated from the live Supabase schema (project uuolkaqaeibiwqunnwwe). Do not edit by hand.
// Regenerate after every migration: Supabase MCP `generate_typescript_types`, or
//   npx supabase gen types typescript --project-id uuolkaqaeibiwqunnwwe > lib/supabase/database.types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      addons: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          description: string | null
          id: string
          name: string
          price_minor: number
          region: Database["public"]["Enums"]["billing_region"]
          sort: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name: string
          price_minor: number
          region?: Database["public"]["Enums"]["billing_region"]
          sort?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name?: string
          price_minor?: number
          region?: Database["public"]["Enums"]["billing_region"]
          sort?: number
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: number
          meta: Json
          workspace_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: never
          meta?: Json
          workspace_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: never
          meta?: Json
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          created_at: string
          error: string | null
          external_run_id: string | null
          finished_at: string | null
          id: string
          input: Json
          output: Json
          started_at: string
          status: string
          trigger: string
          workflow: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          external_run_id?: string | null
          finished_at?: string | null
          id?: string
          input?: Json
          output?: Json
          started_at?: string
          status?: string
          trigger: string
          workflow: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          external_run_id?: string | null
          finished_at?: string | null
          id?: string
          input?: Json
          output?: Json
          started_at?: string
          status?: string
          trigger?: string
          workflow?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_entries: {
        Row: {
          key: string
          published: boolean
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          published?: boolean
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          published?: boolean
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      companies: {
        Row: {
          country: string | null
          created_at: string
          domain: string | null
          id: string
          industry: string | null
          name: string
          notes: string | null
          size_band: string | null
          updated_at: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          size_band?: string | null
          updated_at?: string
          website?: string | null
          workspace_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          size_band?: string | null
          updated_at?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          basis: string
          contact_id: string
          id: string
          ip_hash: string | null
          policy_version: string
          purpose: string
          recorded_at: string
          source: string
          status: string
          user_agent: string | null
          workspace_id: string
        }
        Insert: {
          basis: string
          contact_id: string
          id?: string
          ip_hash?: string | null
          policy_version?: string
          purpose: string
          recorded_at?: string
          source: string
          status: string
          user_agent?: string | null
          workspace_id: string
        }
        Update: {
          basis?: string
          contact_id?: string
          id?: string
          ip_hash?: string | null
          policy_version?: string
          purpose?: string
          recorded_at?: string
          source?: string
          status?: string
          user_agent?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_contact_id_workspace_id_fkey"
            columns: ["contact_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "consent_records_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          email_status: string
          email_verified_at: string | null
          full_name: string
          id: string
          job_title: string | null
          phone: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          email_status?: string
          email_verified_at?: string | null
          full_name?: string
          id?: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          email_status?: string
          email_verified_at?: string | null
          full_name?: string
          id?: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_workspace_id_fkey"
            columns: ["company_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          duplicate_count: number
          error: string | null
          finished_at: string | null
          found_count: number
          id: string
          imported_count: number
          legal_basis: string
          max_results: number
          query: Json
          rejected_count: number
          source: string
          source_name: string
          started_at: string | null
          status: string
          suppressed_count: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duplicate_count?: number
          error?: string | null
          finished_at?: string | null
          found_count?: number
          id?: string
          imported_count?: number
          legal_basis: string
          max_results?: number
          query?: Json
          rejected_count?: number
          source: string
          source_name: string
          started_at?: string | null
          status?: string
          suppressed_count?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duplicate_count?: number
          error?: string | null
          finished_at?: string | null
          found_count?: number
          id?: string
          imported_count?: number
          legal_basis?: string
          max_results?: number
          query?: Json
          rejected_count?: number
          source?: string
          source_name?: string
          started_at?: string | null
          status?: string
          suppressed_count?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_settings: {
        Row: {
          scoring: Json
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          scoring: Json
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          scoring?: Json
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          contact_id: string | null
          created_at: string
          draft_id: string | null
          event: string
          id: string
          meta: Json
          occurred_at: string
          provider: string
          provider_message_id: string
          workspace_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          draft_id?: string | null
          event: string
          id?: string
          meta?: Json
          occurred_at?: string
          provider: string
          provider_message_id: string
          workspace_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          draft_id?: string | null
          event?: string
          id?: string
          meta?: Json
          occurred_at?: string
          provider?: string
          provider_message_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_events_contact_id_workspace_id_fkey"
            columns: ["contact_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "email_events_draft_id_workspace_id_fkey"
            columns: ["draft_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "outreach_drafts"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "email_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          currency: string
          email: string | null
          id: string
          number: number
          plan_id: string | null
          provider: string
          provider_ref: string
          snapshot: Json
          status: string
          subtotal_minor: number
          tax_minor: number
          total_minor: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          currency: string
          email?: string | null
          id?: string
          number?: never
          plan_id?: string | null
          provider: string
          provider_ref: string
          snapshot: Json
          status?: string
          subtotal_minor: number
          tax_minor?: number
          total_minor: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          number?: never
          plan_id?: string | null
          provider?: string
          provider_ref?: string
          snapshot?: Json
          status?: string
          subtotal_minor?: number
          tax_minor?: number
          total_minor?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          id: string
          kind: string
          lead_id: string
          meta: Json
          occurred_at: string
          workspace_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          lead_id: string
          meta?: Json
          occurred_at?: string
          workspace_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          lead_id?: string
          meta?: Json
          occurred_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_workspace_id_fkey"
            columns: ["lead_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "lead_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scores: {
        Row: {
          created_at: string
          factors: Json
          id: string
          lead_id: string
          model: string
          score: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          factors?: Json
          id?: string
          lead_id: string
          model?: string
          score: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          factors?: Json
          id?: string
          lead_id?: string
          model?: string
          score?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_scores_lead_id_workspace_id_fkey"
            columns: ["lead_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "lead_scores_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          currency: string
          email: string | null
          id: string
          last_activity_at: string | null
          name: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          qualification: string
          score: number
          source: string
          stage: string
          updated_at: string
          value_minor: number
          workspace_id: string
        }
        Insert: {
          company?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          last_activity_at?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          qualification?: string
          score?: number
          source?: string
          stage?: string
          updated_at?: string
          value_minor?: number
          workspace_id?: string
        }
        Update: {
          company?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          last_activity_at?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          qualification?: string
          score?: number
          source?: string
          stage?: string
          updated_at?: string
          value_minor?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_fk"
            columns: ["company_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "leads_contact_fk"
            columns: ["contact_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          amount_minor: number
          closed_at: string | null
          created_at: string
          currency: string
          expected_close: string | null
          id: string
          lead_id: string
          name: string
          owner_id: string | null
          probability: number
          stage: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount_minor?: number
          closed_at?: string | null
          created_at?: string
          currency?: string
          expected_close?: string | null
          id?: string
          lead_id: string
          name: string
          owner_id?: string | null
          probability?: number
          stage?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount_minor?: number
          closed_at?: string | null
          created_at?: string
          currency?: string
          expected_close?: string | null
          id?: string
          lead_id?: string
          name?: string
          owner_id?: string | null
          probability?: number
          stage?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_lead_id_workspace_id_fkey"
            columns: ["lead_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "opportunities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      outbox_events: {
        Row: {
          aggregate_id: string | null
          attempts: number
          created_at: string
          delivered_at: string | null
          id: string
          last_error: string | null
          next_attempt_at: string
          payload: Json
          status: string
          topic: string
          workspace_id: string
        }
        Insert: {
          aggregate_id?: string | null
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          status?: string
          topic: string
          workspace_id: string
        }
        Update: {
          aggregate_id?: string | null
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          status?: string
          topic?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbox_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_drafts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body: string
          channel: string
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          lead_id: string | null
          provider_message_id: string | null
          rejected_reason: string | null
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body: string
          channel?: string
          contact_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          provider_message_id?: string | null
          rejected_reason?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          channel?: string
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          provider_message_id?: string | null
          rejected_reason?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_drafts_contact_id_workspace_id_fkey"
            columns: ["contact_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "outreach_drafts_lead_id_workspace_id_fkey"
            columns: ["lead_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "outreach_drafts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          amount_minor: number
          currency: string
          gst_rate: number
          id: string
          interval: string
          name: string
          region: Database["public"]["Enums"]["billing_region"]
          sort: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_minor: number
          currency: string
          gst_rate?: number
          id: string
          interval: string
          name: string
          region: Database["public"]["Enums"]["billing_region"]
          sort?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_minor?: number
          currency?: string
          gst_rate?: number
          id?: string
          interval?: string
          name?: string
          region?: Database["public"]["Enums"]["billing_region"]
          sort?: number
          updated_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          body: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          region: Database["public"]["Enums"]["billing_region"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          region?: Database["public"]["Enums"]["billing_region"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          region?: Database["public"]["Enums"]["billing_region"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget_minor: number
          client_id: string | null
          created_at: string
          currency: string
          description: string | null
          due_date: string | null
          id: string
          milestones: Json
          name: string
          progress: number
          status: string
          updated_at: string
        }
        Insert: {
          budget_minor?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          milestones?: Json
          name: string
          progress?: number
          status?: string
          updated_at?: string
        }
        Update: {
          budget_minor?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          milestones?: Json
          name?: string
          progress?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          category: string | null
          city: string | null
          company_id: string | null
          country: string | null
          created_at: string
          created_by: string | null
          discovery_job_id: string | null
          domain: string | null
          expires_at: string | null
          id: string
          industry: string | null
          intent_signals: string[]
          name: string
          notes: string | null
          provider: string
          provider_ref: string | null
          region: string | null
          research_status: string
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          score: number | null
          score_breakdown: Json | null
          scored_at: string | null
          size_band: string | null
          source: string
          updated_at: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          category?: string | null
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          discovery_job_id?: string | null
          domain?: string | null
          expires_at?: string | null
          id?: string
          industry?: string | null
          intent_signals?: string[]
          name: string
          notes?: string | null
          provider?: string
          provider_ref?: string | null
          region?: string | null
          research_status?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          score_breakdown?: Json | null
          scored_at?: string | null
          size_band?: string | null
          source: string
          updated_at?: string
          website?: string | null
          workspace_id: string
        }
        Update: {
          category?: string | null
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          discovery_job_id?: string | null
          domain?: string | null
          expires_at?: string | null
          id?: string
          industry?: string | null
          intent_signals?: string[]
          name?: string
          notes?: string | null
          provider?: string
          provider_ref?: string | null
          region?: string | null
          research_status?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          score_breakdown?: Json | null
          scored_at?: string | null
          size_band?: string | null
          source?: string
          updated_at?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_company_id_workspace_id_fkey"
            columns: ["company_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "prospects_discovery_job_id_workspace_id_fkey"
            columns: ["discovery_job_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "discovery_jobs"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "prospects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_minor: number
          client_id: string
          created_at: string
          currency: string
          current_period_end: string | null
          id: string
          interval: string
          plan_id: string | null
          provider: string
          provider_ref: string | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          client_id: string
          created_at?: string
          currency?: string
          current_period_end?: string | null
          id?: string
          interval?: string
          plan_id?: string | null
          provider?: string
          provider_ref?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          client_id?: string
          created_at?: string
          currency?: string
          current_period_end?: string | null
          id?: string
          interval?: string
          plan_id?: string | null
          provider?: string
          provider_ref?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      suppression_entries: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          note: string | null
          reason: string
          value_hash: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          note?: string | null
          reason: string
          value_hash: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          note?: string | null
          reason?: string
          value_hash?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppression_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          body: string | null
          client_id: string | null
          created_at: string
          id: string
          kind: string
          priority: string
          response: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          priority?: string
          response?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          priority?: string
          response?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          event_id: string
          provider: string
          received_at: string
        }
        Insert: {
          event_id: string
          provider: string
          received_at?: string
        }
        Update: {
          event_id?: string
          provider?: string
          received_at?: string
        }
        Relationships: []
      }
      website_analyses: {
        Row: {
          bytes: number | null
          confirmed_count: number
          created_at: string
          duration_ms: number | null
          error: string | null
          final_url: string | null
          findings: Json
          http_status: number | null
          id: string
          inferred_count: number
          prospect_id: string
          signals: Json
          status: string
          url: string
          workspace_id: string
        }
        Insert: {
          bytes?: number | null
          confirmed_count?: number
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          final_url?: string | null
          findings?: Json
          http_status?: number | null
          id?: string
          inferred_count?: number
          prospect_id: string
          signals?: Json
          status: string
          url: string
          workspace_id: string
        }
        Update: {
          bytes?: number | null
          confirmed_count?: number
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          final_url?: string | null
          findings?: Json
          http_status?: number | null
          id?: string
          inferred_count?: number
          prospect_id?: string
          signals?: Json
          status?: string
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_analyses_prospect_id_workspace_id_fkey"
            columns: ["prospect_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "website_analyses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cms_published_all: { Args: never; Returns: Json }
      crm_intake: {
        Args: {
          p_company_name: string
          p_domain: string
          p_email: string
          p_factors: Json
          p_ip_hash: string
          p_message: string
          p_name: string
          p_qualification: string
          p_score: number
          p_source: string
          p_user_agent: string
          p_website: string
        }
        Returns: Json
      }
      crm_purge_expired: { Args: never; Returns: Json }
      prospect_add_to_crm: {
        Args: { p_company: Json; p_prospect: string; p_qualification: string }
        Returns: Json
      }
      rate_limit_hit: {
        Args: { p_bucket: string; p_max: number; p_window_s: number }
        Returns: boolean
      }
      suppression_hash: { Args: { value: string }; Returns: string }
    }
    Enums: {
      app_role: "client" | "admin"
      billing_region: "IN" | "GLOBAL"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["client", "admin"],
      billing_region: ["IN", "GLOBAL"],
    },
  },
} as const
