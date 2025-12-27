// Icypeas API Types

export type IcypeasSearchStatus = 'NONE' | 'SCHEDULED' | 'IN_PROGRESS' | 'FOUND' | 'NOT_FOUND' | 'DEBITED' | 'DEBITED_NOT_FOUND';

export interface IcypeasEmailSearchRequest {
  firstname: string;
  lastname: string;
  domainOrCompany: string;
}

export interface IcypeasEmailSearchItem {
  _id: string;
  status: IcypeasSearchStatus;
}

export interface IcypeasEmailSearchResponse {
  success: boolean;
  item: IcypeasEmailSearchItem;
}

export interface IcypeasEmailResult {
  email: string;
  certainty: string;
  mxRecords?: string[];
  mxProvider?: string;
}

export interface IcypeasSearchResultItem {
  _id: string;
  status: IcypeasSearchStatus;
  results?: {
    firstname?: string;
    lastname?: string;
    fullname?: string;
    emails?: IcypeasEmailResult[];
    phones?: unknown[];
  };
  userData?: {
    webhookUrl?: string;
    externalId?: string;
    provider?: string;
  };
  system?: {
    createdAt?: string;
    modifiedAt?: string;
  };
}

export interface IcypeasSearchResultResponse {
  success: boolean;
  items?: IcypeasSearchResultItem[];
  total?: number;
}

