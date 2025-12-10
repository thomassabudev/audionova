import React from 'react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  onClick: () => void;
  disabled?: boolean;
  isCollapsed?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  label,
  tooltip,
  onClick,
  disabled = false,
  isCollapsed = false,
  variant = 'outline'
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size="sm"
            className="h-12 flex flex-col items-center justify-center gap-1 py-1 px-2"
            onClick={onClick}
            disabled={disabled}
            aria-label={tooltip}
          >
            {icon}
            {!isCollapsed && (
              <span className="text-xs">{label}</span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default QuickActionButton;