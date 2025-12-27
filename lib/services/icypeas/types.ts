// Icypeas API Types

export type IcypeasSearchStatus = 'NONE' | 'SCHEDULED' | 'IN_PROGRESS' | 'DEBITED';

export interface IcypeasEmailSearchRequest {
  firstname: string;
  lastname: string;
  domainOrCompany: string;
}

export interface IcypeasEmailSearchResponse {
  _id: string;
  status: IcypeasSearchStatus;
  email?: string;
  firstname?: string;
  lastname?: string;
  domainOrCompany?: string;
  [key: string]: unknown; // Allow for additional fields
}

export interface IcypeasSearchResultResponse {
  id: string;
  status: IcypeasSearchStatus;
  email?: string;
  firstname?: string;
  lastname?: string;
  domainOrCompany?: string;
  [key: string]: unknown; // Allow for additional fields
}

