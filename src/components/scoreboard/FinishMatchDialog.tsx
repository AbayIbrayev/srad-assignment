import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { InProgressMatch } from '@/domain/match'

import { scoreline } from './match-text'

/**
 * Finishing is terminal — a finished match cannot be scored, edited or undone —
 * so it is the one action in the app that a mis-click cannot walk back. That is
 * the whole justification for a confirmation step here and nowhere else.
 */
export function FinishMatchDialog({
  match,
  open,
  onOpenChange,
  onConfirm,
}: {
  match: InProgressMatch
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finish this match?</DialogTitle>
          <DialogDescription>
            {scoreline(match)} will be recorded as the final score. Finished matches leave the
            in-progress summary and cannot be scored or reopened.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Keep playing</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onConfirm}>
            Finish match
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
