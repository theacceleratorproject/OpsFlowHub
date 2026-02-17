import { useProject } from '@/contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { useProjects, useProjectVersions, useCreateProject, useCreateProjectVersion, type ProjectRow, type ProjectVersionRow } from '@/hooks/use-supabase-data';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const ProjectSelector = () => {
  const { setSelectedProject, setSelectedVersion } = useProject();
  const navigate = useNavigate();
  const [activeProject, setActiveProject] = useState<ProjectRow | null>(null);

  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: versions = [], isLoading: versionsLoading } = useProjectVersions(activeProject?.id);

  const createProject = useCreateProject();
  const createVersion = useCreateProjectVersion();

  // Create project form state
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProject, setNewProject] = useState({ project_name: '', customer: '', project_lead: '', start_date: '', target_end_date: '' });

  // Create version form state
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');

  const handleSelectProject = (project: ProjectRow) => {
    setActiveProject(project);
  };

  const handleSelectVersion = (version: ProjectVersionRow) => {
    if (!activeProject) return;
    setSelectedProject(activeProject);
    setSelectedVersion(version);
    navigate('/dashboard');
  };

  const handleCreateProject = async () => {
    if (!newProject.project_name.trim()) return;
    try {
      await createProject.mutateAsync({
        project_name: newProject.project_name.trim(),
        customer: newProject.customer.trim() || null,
        project_lead: newProject.project_lead.trim() || null,
        start_date: newProject.start_date || null,
        target_end_date: newProject.target_end_date || null,
      });
      toast.success('Project created');
      setShowCreateProject(false);
      setNewProject({ project_name: '', customer: '', project_lead: '', start_date: '', target_end_date: '' });
    } catch {
      toast.error('Failed to create project');
    }
  };

  const handleCreateVersion = async () => {
    if (!activeProject || !newVersionName.trim()) return;
    try {
      await createVersion.mutateAsync({
        project_id: activeProject.id,
        version_name: newVersionName.trim(),
      });
      toast.success('Version created');
      setShowCreateVersion(false);
      setNewVersionName('');
    } catch {
      toast.error('Failed to create version');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="ops-header-bg">
        <div className="mx-auto max-w-4xl px-4 py-20 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-9 w-9 rounded bg-accent flex items-center justify-center">
                <span className="text-accent-foreground font-bold text-sm">OP</span>
              </div>
              <h1 className="text-2xl font-bold text-primary-foreground tracking-tight">
                OpsPulse
              </h1>
            </div>
            <div className="ops-accent-line mb-4" />
            <p className="text-primary-foreground/50 text-sm">
              {activeProject ? `Select version for ${activeProject.project_name}` : 'Select a project to continue'}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 -mt-6 pb-16 md:px-6">
        <AnimatePresence mode="wait">
          {!activeProject ? (
            <motion.div
              key="projects"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              {projectsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {projects.map((project, i) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                    >
                      <button
                        onClick={() => handleSelectProject(project)}
                        className="module-card w-full text-left group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                            {project.id.slice(0, 8)}
                          </span>
                          <span className={cn(
                            "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
                            project.status === 'Active' && "text-ops-green bg-ops-green/8",
                            project.status === 'On Hold' && "text-ops-amber bg-ops-amber/8",
                          )}>
                            {project.status}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {project.project_name}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-3">{project.customer}</p>
                        {project.project_lead && (
                          <p className="text-xs text-muted-foreground">Lead: {project.project_lead}</p>
                        )}
                        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                          Select <ArrowRight className="h-3 w-3" />
                        </div>
                      </button>
                    </motion.div>
                  ))}

                  {/* Create Project Card */}
                  <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
                    <DialogTrigger asChild>
                      <motion.button
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: projects.length * 0.05 }}
                        className="module-card w-full text-left border-dashed flex flex-col items-center justify-center py-8 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Plus className="h-6 w-6 mb-2" />
                        <span className="text-sm font-medium">Create Project</span>
                      </motion.button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 pt-2">
                        <div>
                          <Label>Project Name *</Label>
                          <Input value={newProject.project_name} onChange={e => setNewProject(p => ({ ...p, project_name: e.target.value }))} placeholder="e.g. ICEPACK" />
                        </div>
                        <div>
                          <Label>Customer</Label>
                          <Input value={newProject.customer} onChange={e => setNewProject(p => ({ ...p, customer: e.target.value }))} placeholder="e.g. Celestica Inc" />
                        </div>
                        <div>
                          <Label>Project Lead</Label>
                          <Input value={newProject.project_lead} onChange={e => setNewProject(p => ({ ...p, project_lead: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Start Date</Label>
                            <Input type="date" value={newProject.start_date} onChange={e => setNewProject(p => ({ ...p, start_date: e.target.value }))} />
                          </div>
                          <div>
                            <Label>Target End Date</Label>
                            <Input type="date" value={newProject.target_end_date} onChange={e => setNewProject(p => ({ ...p, target_end_date: e.target.value }))} />
                          </div>
                        </div>
                        <Button onClick={handleCreateProject} disabled={createProject.isPending || !newProject.project_name.trim()} className="w-full">
                          {createProject.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Create Project
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {!projectsLoading && projects.length === 0 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  No projects yet. Create one to get started.
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="versions"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <button
                onClick={() => setActiveProject(null)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to projects
              </button>

              {versionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {versions.map((version, i) => (
                    <motion.div
                      key={version.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                    >
                      <button
                        onClick={() => handleSelectVersion(version)}
                        className="module-card w-full text-left group"
                      >
                        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                          {version.id.slice(0, 8)}
                        </span>
                        <h3 className="text-lg font-semibold text-foreground mt-2 mb-1">
                          {activeProject.project_name} — {version.version_name}
                        </h3>
                        <p className="text-xs text-muted-foreground">{activeProject.customer}</p>
                        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                          Open <ArrowRight className="h-3 w-3" />
                        </div>
                      </button>
                    </motion.div>
                  ))}

                  {/* Add Version Card */}
                  <Dialog open={showCreateVersion} onOpenChange={setShowCreateVersion}>
                    <DialogTrigger asChild>
                      <motion.button
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: versions.length * 0.05 }}
                        className="module-card w-full text-left border-dashed flex flex-col items-center justify-center py-8 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Plus className="h-6 w-6 mb-2" />
                        <span className="text-sm font-medium">Add Version</span>
                      </motion.button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Version to {activeProject.project_name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 pt-2">
                        <div>
                          <Label>Version Name *</Label>
                          <Input value={newVersionName} onChange={e => setNewVersionName(e.target.value)} placeholder="e.g. V1.0" />
                        </div>
                        <Button onClick={handleCreateVersion} disabled={createVersion.isPending || !newVersionName.trim()} className="w-full">
                          {createVersion.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Add Version
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {!versionsLoading && versions.length === 0 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  No versions yet. Add one to get started.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProjectSelector;
