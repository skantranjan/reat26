declare module 'react-collapse' {
  import * as React from 'react';
  export interface CollapseProps {
    isOpened: boolean;
    children?: React.ReactNode;
    theme?: any;
    initialStyle?: any;
    hasNestedCollapse?: boolean;
    [key: string]: any;
  }
  export class Collapse extends React.Component<CollapseProps> {}
} 