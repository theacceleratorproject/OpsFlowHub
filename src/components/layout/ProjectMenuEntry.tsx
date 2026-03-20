import { useProjectVersions } from '@/hooks/use-supabase-data';
import type { ProjectRow, ProjectVersionRow } from '@/hooks/use-supabase-data';
import { cn } from '@/lib/utils';
import {
  DropdownMenuItem,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';

export const ProjectMenuEntry = ({
  project,
  isCurrentProject,
  currentVersionId,
  onSelect,
}: {
  project: ProjectRow;
  isCurrentProject: boolean;
  currentVersionId: string;
  onSelect: (project: ProjectRow, version: ProjectVersionRow) => void;
}) => {
  const { data: versions = [] } = useProjectVersions(project.id);

  // If there's only one version or no versions, show as a flat item
  if (versions.length <= 1) {
    const version = versions[0];
    if (!version) return null;
    const isCurrent = isCurrentProject && version.id === currentVersionId;
    return (
      <DropdownMenuItem
        onClick={() => onSelect(project, version)}
        className={cn("text-xs cursor-pointer", isCurrent && "bg-accent/10")}
      >
        <span className={cn("truncate", isCurrent && "font-semibold")}>
          {project.project_name} — {version.version_name}
        </span>
        {isCurrent && (
          <span className="ml-auto text-[9px] text-muted-foreground">current</span>
        )}
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="text-xs cursor-pointer">
        <span className={cn("truncate", isCurrentProject && "font-semibold")}>
          {project.project_name}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-44">
        {versions.map(version => {
          const isCurrent = isCurrentProject && version.id === currentVersionId;
          return (
            <DropdownMenuItem
              key={version.id}
              onClick={() => onSelect(project, version)}
              className={cn("text-xs cursor-pointer", isCurrent && "bg-accent/10")}
            >
              <span className={cn("truncate", isCurrent && "font-semibold")}>
                {version.version_name}
              </span>
              {isCurrent && (
                <span className="ml-auto text-[9px] text-muted-foreground">current</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};
