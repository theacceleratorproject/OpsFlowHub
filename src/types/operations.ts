export type ProjectStatus = 'Active' | 'On Hold' | 'Complete' | 'Cancelled';
export type MaterialStatus = 'Available' | 'Short' | 'Critical';
export type TaskPhase = 'MP' | 'EVT' | 'DVT' | 'PPVT' | 'Production';
export type TaskStatus = 'Not Started' | 'In Progress' | 'Blocked' | 'Complete';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type RequestUrgency = 'Standard' | 'Expedite' | 'Critical';
export type RequestStatus = 'Pending' | 'Approved' | 'Ordered' | 'Received' | 'Rejected';
export type PickStatus = 'Pending' | 'In Progress' | 'Picked' | 'Verified' | 'Issue';
export type IssueModule = 'Material' | 'Task' | 'PartRequest' | 'PickingOrder' | 'Other';
export type IssuePriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type IssueStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export interface ProjectVersion {
  versionId: string;
  versionName: string;
  projectId: string;
}

export interface Project {
  projectId: string;
  projectName: string;
  customer: string;
  startDate: string;
  targetEndDate: string;
  projectLead: string;
  status: ProjectStatus;
  notes?: string;
  versions: ProjectVersion[];
}

export interface Material {
  materialId: string;
  projectId: string;
  partNumber: string;
  description: string;
  requiredQty: number;
  onHandQty: number;
  onOrderQty: number;
  variance: number;
  status: MaterialStatus;
  lastUpdated: string;
  updatedBy: string;
}

export interface TaskStep {
  stepId: string;
  taskId: string;
  stepName: string;
  weight: number; // contribution weight (all weights in a task sum to 1)
  complete: boolean;
}

export interface Task {
  taskId: string;
  projectId: string;
  taskName: string;
  phase: TaskPhase;
  assignedTo: string;
  startDate: string;
  dueDate: string;
  progress: number;
  status: TaskStatus;
  blockedReason?: string;
  priority: TaskPriority;
  notes?: string;
}

export interface PartRequest {
  requestId: string;
  projectId: string;
  partNumber: string;
  requestedQty: number;
  requestedBy: string;
  requestDate: string;
  neededByDate: string;
  urgency: RequestUrgency;
  status: RequestStatus;
  approvedBy?: string;
  approvalDate?: string;
  rejectionReason?: string;
}

export interface PickingOrder {
  pickId: string;
  projectId: string;
  workOrderNumber: string;
  partNumber: string;
  pickQty: number;
  binLocation: string;
  assignedPicker: string;
  status: PickStatus;
  pickedQty?: number;
  pickedDateTime?: string;
  verifiedBy?: string;
  issueNote?: string;
}

export interface BOM {
  bomId: string;
  projectId: string;
  bomName: string;
  revision: string;
  createdDate: string;
  createdBy: string;
  status: 'Draft' | 'Released' | 'Obsolete';
  notes?: string;
}

export interface BOMLine {
  lineId: string;
  bomId: string;
  lineNumber: number;
  partNumber: string;
  description: string;
  quantity: number;
  uom: string;
  referenceDesignator?: string;
  supplier?: string;
  leadTimeDays?: number;
  unitCost?: number;
  notes?: string;
}

export interface Issue {
  issueId: string;
  projectId: string;
  relatedModule: IssueModule;
  relatedRecordId?: string;
  issueDescription: string;
  raisedBy: string;
  raisedDate: string;
  assignedTo: string;
  priority: IssuePriority;
  status: IssueStatus;
  rootCause?: string;
  resolution?: string;
  resolvedDate?: string;
}
