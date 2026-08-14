import { ReactNode } from "react";
import { SuperAppDesktopLayout, type SuperAppNav } from "./SuperAppDesktopLayout";

type Props = {
  children: ReactNode;
  nav?: SuperAppNav;
  className?: string;
  contentClassName?: string;
  showFooter?: boolean;
  dark?: boolean;
};

export function SuperAppShell({
  children,
  nav = "home",
  className,
  contentClassName,
  showFooter,
  dark,
}: Props) {
  return (
    <SuperAppDesktopLayout
      nav={nav}
      className={className}
      contentClassName={contentClassName}
      showFooter={showFooter}
      dark={dark}
    >
      {children}
    </SuperAppDesktopLayout>
  );
}
