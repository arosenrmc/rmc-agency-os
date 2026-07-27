"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Task } from "@/lib/types/database";

type TaskListProps = {
  projectId: string;
  tasks: Task[];
};

export default function TaskList({ projectId, tasks: initialTasks }: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("tasks")
        .insert([
          {
            project_id: projectId,
            user_id: user.id,
            title: newTaskTitle,
            status: "todo",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setTasks([data, ...tasks]);
      }

      setNewTaskTitle("");
      setIsAdding(false);
      router.refresh();
    } catch (err) {
      console.error("Error adding task:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "todo" : "done";

    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: newStatus,
          completed_at: newStatus === "done" ? new Date().toISOString() : null,
        })
        .eq("id", taskId);

      if (error) throw error;

      setTasks(tasks.map(task =>
        task.id === taskId
          ? { ...task, status: newStatus as Task["status"], completed_at: newStatus === "done" ? new Date().toISOString() : null }
          : task
      ));

      router.refresh();
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;

      setTasks(tasks.filter(task => task.id !== taskId));
      router.refresh();
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const todoTasks = tasks.filter(t => t.status !== "done");
  const doneTasks = tasks.filter(t => t.status === "done");

  return (
    <div className="bg-surface border border-border rounded-xl">
      <div className="p-6 border-b border-border">
        <div className="flex justify-between items-center">
          <h2 className="text-[15px] font-semibold text-ink">Tasks</h2>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="text-accent-strong hover:text-accent text-[13px] font-medium transition-colors"
            >
              + Add Task
            </button>
          )}
        </div>

        {isAdding && (
          <form onSubmit={handleAddTask} className="mt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title..."
                className="flex-1 px-4 py-2.5 bg-tile border border-border rounded-lg text-ink placeholder:text-faint focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !newTaskTitle.trim()}
                className="bg-accent hover:bg-accent-strong text-white rounded-lg font-medium px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setNewTaskTitle("");
                }}
                className="bg-tile border border-border text-ink hover:border-faint rounded-lg px-4 py-2.5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="p-6">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-faint"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            <h3 className="mt-2 text-[13.5px] font-medium text-ink">No tasks</h3>
            <p className="mt-1 text-[13px] text-faint">
              Get started by creating your first task.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {todoTasks.length > 0 && (
              <div>
                <h3 className="text-faint text-[10px] uppercase tracking-wide font-normal mb-3">
                  To Do ({todoTasks.length})
                </h3>
                <div className="space-y-1">
                  {todoTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-tile group transition-colors"
                    >
                      <button
                        onClick={() => handleToggleTask(task.id, task.status)}
                        className="flex-shrink-0 w-5 h-5 border-2 border-border rounded hover:border-accent transition-colors"
                      />
                      <span className="flex-1 text-ink text-[13.5px]">{task.title}</span>
                      {task.due_date && (
                        <span className="text-[12px] text-faint tabular-nums">
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-faint hover:text-accent-strong transition-all"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {doneTasks.length > 0 && (
              <div>
                <h3 className="text-faint text-[10px] uppercase tracking-wide font-normal mb-3">
                  Completed ({doneTasks.length})
                </h3>
                <div className="space-y-1">
                  {doneTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-tile group opacity-60 transition-colors"
                    >
                      <button
                        onClick={() => handleToggleTask(task.id, task.status)}
                        className="flex-shrink-0 w-5 h-5 bg-good border-2 border-good rounded flex items-center justify-center hover:opacity-80 transition-opacity"
                      >
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>
                      <span className="flex-1 text-muted text-[13.5px] line-through">
                        {task.title}
                      </span>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-faint hover:text-accent-strong transition-all"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
