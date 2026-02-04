"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Instagram, Trash2, Calendar } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AutoList } from "../types";

interface AutolistsTableProps {
  autolists: AutoList[];
  projectId: string;
  onDelete: (id: string) => void;
}

export function AutolistsTable({
  autolists,
  projectId,
  onDelete,
}: AutolistsTableProps) {
  const router = useRouter();

  const handleRowClick = (autolist: AutoList) => {
    router.push(`/projects/${projectId}/autolists/${autolist.id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete(id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 overflow-hidden bg-card shadow-sm"
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="font-semibold text-foreground">Name</TableHead>
            <TableHead className="font-semibold text-foreground">Next Publish</TableHead>
            <TableHead className="font-semibold text-foreground">Network</TableHead>
            <TableHead className="font-semibold text-foreground text-center">Posts</TableHead>
            <TableHead className="font-semibold text-foreground w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {autolists.map((autolist, index) => (
            <motion.tr
              key={autolist.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleRowClick(autolist)}
              className="cursor-pointer border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors group"
            >
              <TableCell className="font-medium py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <span className="group-hover:text-primary transition-colors">
                    {autolist.name}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground py-4">
                {autolist.nextPublishTime || "Not scheduled"}
              </TableCell>
              <TableCell className="py-4">
                <Badge
                  variant="secondary"
                  className="gap-1.5 bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-600 border-pink-200/50"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  Instagram
                </Badge>
              </TableCell>
              <TableCell className="text-center py-4">
                <Badge variant="outline" className="font-mono">
                  {autolist.postsCount ?? autolist.entries.length}
                </Badge>
              </TableCell>
              <TableCell className="py-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDeleteClick(e, autolist.id)}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}
