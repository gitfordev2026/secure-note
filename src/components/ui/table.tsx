"use client";

import * as React from "react";

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}

const Table = React.forwardRef<HTMLTableElement, TableProps>(({ className, ...props }, ref) => (
  <div className="w-full overflow-auto">
    <table ref={ref} className="w-full caption-bottom text-sm" {...props} />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={className} {...props} />
  ),
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={className} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={className} {...props} />
  ),
);
TableFooter.displayName = "TableFooter";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={[
        "text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className,
      ].join(" ")}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={[
        "align-middle border-b transition-colors hover:bg-accent/50 data-[state=selected]:bg-accent",
        className,
      ].join(" ")}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={["p-4 align-middle [&:has([role=checkbox])]:pr-0", className].join(" ")}
      {...props}
    />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={["mt-4 text-sm text-muted-foreground", className].join(" ")} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
