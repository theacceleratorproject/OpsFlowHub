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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bom_lines: {
        Row: {
          alt_item_group: string | null
          assembly_indicator: boolean | null
          backflush: boolean | null
          base_unit_measure: string | null
          bom_level: number
          bulk_material: boolean | null
          change_number: string | null
          comp_tux_material_group: string | null
          component_number: string
          component_quantity: number
          component_unit: string | null
          created_at: string
          effective_out_date: string | null
          engineering_design: string | null
          explosive_level: number | null
          follow_up_material: string | null
          id: string
          item_category: string | null
          item_number: string | null
          item_text_line_2: string | null
          material_type: string | null
          object_description: string | null
          phantom: boolean | null
          plant_sp_matl: string | null
          project_version_id: string | null
          relevancy_to_costing: boolean | null
          required_qty: number
          sort_string: string | null
          special_procurement_type: string | null
          standard_price: number | null
          storage_location: string | null
          supplier_sap: string | null
          upload_batch_id: string
          uploaded_at: string
          usage_probability: number | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          alt_item_group?: string | null
          assembly_indicator?: boolean | null
          backflush?: boolean | null
          base_unit_measure?: string | null
          bom_level?: number
          bulk_material?: boolean | null
          change_number?: string | null
          comp_tux_material_group?: string | null
          component_number: string
          component_quantity?: number
          component_unit?: string | null
          created_at?: string
          effective_out_date?: string | null
          engineering_design?: string | null
          explosive_level?: number | null
          follow_up_material?: string | null
          id?: string
          item_category?: string | null
          item_number?: string | null
          item_text_line_2?: string | null
          material_type?: string | null
          object_description?: string | null
          phantom?: boolean | null
          plant_sp_matl?: string | null
          project_version_id?: string | null
          relevancy_to_costing?: boolean | null
          required_qty?: number
          sort_string?: string | null
          special_procurement_type?: string | null
          standard_price?: number | null
          storage_location?: string | null
          supplier_sap?: string | null
          upload_batch_id: string
          uploaded_at?: string
          usage_probability?: number | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          alt_item_group?: string | null
          assembly_indicator?: boolean | null
          backflush?: boolean | null
          base_unit_measure?: string | null
          bom_level?: number
          bulk_material?: boolean | null
          change_number?: string | null
          comp_tux_material_group?: string | null
          component_number?: string
          component_quantity?: number
          component_unit?: string | null
          created_at?: string
          effective_out_date?: string | null
          engineering_design?: string | null
          explosive_level?: number | null
          follow_up_material?: string | null
          id?: string
          item_category?: string | null
          item_number?: string | null
          item_text_line_2?: string | null
          material_type?: string | null
          object_description?: string | null
          phantom?: boolean | null
          plant_sp_matl?: string | null
          project_version_id?: string | null
          relevancy_to_costing?: boolean | null
          required_qty?: number
          sort_string?: string | null
          special_procurement_type?: string | null
          standard_price?: number | null
          storage_location?: string | null
          supplier_sap?: string | null
          upload_batch_id?: string
          uploaded_at?: string
          usage_probability?: number | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          bin_location: string | null
          created_at: string
          id: string
          last_counted_at: string | null
          on_hand_qty: number | null
          on_order_qty: number | null
          part_number: string
          project_version_id: string | null
          updated_by: string | null
        }
        Insert: {
          bin_location?: string | null
          created_at?: string
          id?: string
          last_counted_at?: string | null
          on_hand_qty?: number | null
          on_order_qty?: number | null
          part_number: string
          project_version_id?: string | null
          updated_by?: string | null
        }
        Update: {
          bin_location?: string | null
          created_at?: string
          id?: string
          last_counted_at?: string | null
          on_hand_qty?: number | null
          on_order_qty?: number | null
          part_number?: string
          project_version_id?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          alt_supplier_name: string | null
          created_at: string
          currency: string | null
          id: string
          lead_time_days: number | null
          notes: string | null
          part_number: string
          supplier_name: string
          supplier_pn: string | null
          unit_cost: number | null
        }
        Insert: {
          alt_supplier_name?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          part_number: string
          supplier_name: string
          supplier_pn?: string | null
          unit_cost?: number | null
        }
        Update: {
          alt_supplier_name?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          part_number?: string
          supplier_name?: string
          supplier_pn?: string | null
          unit_cost?: number | null
        }
        Relationships: []
      }
      upload_batches: {
        Row: {
          created_at: string
          id: string
          upload_batch_id: string
          uploaded_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          upload_batch_id: string
          uploaded_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          upload_batch_id?: string
          uploaded_at?: string
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          id: string
          project_id: string
          version_id: string | null
          work_order_number: string
          bom_header_id: string | null
          mode: string
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          version_id?: string | null
          work_order_number: string
          bom_header_id?: string | null
          mode?: string
          status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          version_id?: string | null
          work_order_number?: string
          bom_header_id?: string | null
          mode?: string
          status?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "project_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_bom_header_id_fkey"
            columns: ["bom_header_id"]
            isOneToOne: false
            referencedRelation: "bom_lines"
            referencedColumns: ["id"]
          }
        ]
      }
      work_order_lines: {
        Row: {
          id: string
          work_order_id: string
          part_number: string
          description: string | null
          required_qty: number
          unit_of_measure: string | null
          created_at: string
        }
        Insert: {
          id?: string
          work_order_id: string
          part_number: string
          description?: string | null
          required_qty?: number
          unit_of_measure?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          work_order_id?: string
          part_number?: string
          description?: string | null
          required_qty?: number
          unit_of_measure?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_lines_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          }
        ]
      }
      projects: {
        Row: {
          id: string
          project_name: string
          customer: string | null
          start_date: string | null
          target_end_date: string | null
          project_lead: string | null
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_name: string
          customer?: string | null
          start_date?: string | null
          target_end_date?: string | null
          project_lead?: string | null
          status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_name?: string
          customer?: string | null
          start_date?: string | null
          target_end_date?: string | null
          project_lead?: string | null
          status?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      project_versions: {
        Row: {
          id: string
          project_id: string
          version_name: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          version_name: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          version_name?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          version_id: string | null
          task_name: string
          phase: string | null
          assigned_to: string | null
          start_date: string | null
          due_date: string | null
          progress: number
          status: string
          blocked_reason: string | null
          priority: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          version_id?: string | null
          task_name: string
          phase?: string | null
          assigned_to?: string | null
          start_date?: string | null
          due_date?: string | null
          progress?: number
          status?: string
          blocked_reason?: string | null
          priority?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          version_id?: string | null
          task_name?: string
          phase?: string | null
          assigned_to?: string | null
          start_date?: string | null
          due_date?: string | null
          progress?: number
          status?: string
          blocked_reason?: string | null
          priority?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "project_versions"
            referencedColumns: ["id"]
          }
        ]
      }
      task_steps: {
        Row: {
          id: string
          task_id: string
          step_name: string
          weight: number
          complete: boolean
          sort_order: number
          parent_step_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          step_name: string
          weight?: number
          complete?: boolean
          sort_order?: number
          parent_step_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          step_name?: string
          weight?: number
          complete?: boolean
          sort_order?: number
          parent_step_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_steps_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_steps_parent_step_id_fkey"
            columns: ["parent_step_id"]
            isOneToOne: false
            referencedRelation: "task_steps"
            referencedColumns: ["id"]
          }
        ]
      }
      part_requests: {
        Row: {
          id: string
          project_id: string
          version_id: string | null
          part_number: string
          requested_qty: number
          requested_by: string | null
          request_date: string
          needed_by_date: string | null
          urgency: string
          status: string
          approved_by: string | null
          approval_date: string | null
          rejection_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          version_id?: string | null
          part_number: string
          requested_qty?: number
          requested_by?: string | null
          request_date?: string
          needed_by_date?: string | null
          urgency?: string
          status?: string
          approved_by?: string | null
          approval_date?: string | null
          rejection_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          version_id?: string | null
          part_number?: string
          requested_qty?: number
          requested_by?: string | null
          request_date?: string
          needed_by_date?: string | null
          urgency?: string
          status?: string
          approved_by?: string | null
          approval_date?: string | null
          rejection_reason?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_requests_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "project_versions"
            referencedColumns: ["id"]
          }
        ]
      }
      picking_orders: {
        Row: {
          id: string
          project_id: string
          version_id: string | null
          work_order_number: string | null
          part_number: string
          pick_qty: number
          bin_location: string | null
          assigned_picker: string | null
          status: string
          picked_qty: number | null
          picked_date_time: string | null
          verified_by: string | null
          issue_note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          version_id?: string | null
          work_order_number?: string | null
          part_number: string
          pick_qty?: number
          bin_location?: string | null
          assigned_picker?: string | null
          status?: string
          picked_qty?: number | null
          picked_date_time?: string | null
          verified_by?: string | null
          issue_note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          version_id?: string | null
          work_order_number?: string | null
          part_number?: string
          pick_qty?: number
          bin_location?: string | null
          assigned_picker?: string | null
          status?: string
          picked_qty?: number | null
          picked_date_time?: string | null
          verified_by?: string | null
          issue_note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "picking_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picking_orders_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "project_versions"
            referencedColumns: ["id"]
          }
        ]
      }
      issues: {
        Row: {
          id: string
          project_id: string
          version_id: string | null
          related_module: string | null
          related_record_id: string | null
          issue_description: string
          raised_by: string | null
          raised_date: string
          assigned_to: string | null
          priority: string
          status: string
          root_cause: string | null
          resolution: string | null
          resolved_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          version_id?: string | null
          related_module?: string | null
          related_record_id?: string | null
          issue_description: string
          raised_by?: string | null
          raised_date?: string
          assigned_to?: string | null
          priority?: string
          status?: string
          root_cause?: string | null
          resolution?: string | null
          resolved_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          version_id?: string | null
          related_module?: string | null
          related_record_id?: string | null
          issue_description?: string
          raised_by?: string | null
          raised_date?: string
          assigned_to?: string | null
          priority?: string
          status?: string
          root_cause?: string | null
          resolution?: string | null
          resolved_date?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "project_versions"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
