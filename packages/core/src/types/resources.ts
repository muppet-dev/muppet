export type ResourceProps = {
  name: string;
  description?: string;
  mimeType?: string;
  handler?: () => (StaticResource | DynamicResource | ResourceResponse)[];
};

export type StaticResource = ResourceProps & {
  uri: string;
};

export type DynamicResource = ResourceProps & {
  uriTemplate: string;
};

export type ResourceResponse = {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
};
