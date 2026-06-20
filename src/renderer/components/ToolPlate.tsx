import type { ReactElement, ReactNode } from 'react';

interface ToolPlateProps {
  /** Two-digit zero-padded series number, e.g. "02". */
  seriesNumber: string;
  /** Category badge — "TEXT" / "DATE" / "AI". Rendered uppercase. */
  category: string;
  /** Big stenciled tool name — first word is the headline. */
  name: string;
  /** Smaller stenciled subtitle — usually the tool kind (ENCODER, FORMATTER…). */
  subtitle?: string;
  /** Single-line description under the headline. */
  description?: string;
  /** Right-side slot — typically a `<ToolPlateSwitch>` of operations. */
  operations?: ReactNode;
}

export function ToolPlate({
  seriesNumber,
  category,
  name,
  subtitle,
  description,
  operations,
}: ToolPlateProps): ReactElement {
  return (
    <header className="tool-plate" aria-label={`${name} ${subtitle ?? ''}`.trim()}>
      <div className="tool-plate-stamp">
        <div className="tool-plate-meta">
          <span className="tool-plate-meta-no">NO.{seriesNumber}</span>
          <span className="tool-plate-meta-rule" aria-hidden="true" />
          <span>{category.toUpperCase()}</span>
        </div>
        <div className="tool-plate-headline">
          <h1 className="tool-plate-name">{name}</h1>
          {subtitle ? <span className="tool-plate-subtitle">{subtitle}</span> : null}
        </div>
        {description ? <p className="tool-plate-description">{description}</p> : null}
      </div>
      {operations ? <div className="tool-plate-operations">{operations}</div> : null}
    </header>
  );
}

interface ToolPlateSwitchProps {
  children: ReactNode;
}

/** Segmented control housing for the plate's right slot. Children are buttons. */
export function ToolPlateSwitch({ children }: ToolPlateSwitchProps): ReactElement {
  return (
    <div className="tool-plate-switch" role="tablist">
      {children}
    </div>
  );
}
