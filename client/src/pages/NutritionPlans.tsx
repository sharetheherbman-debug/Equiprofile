import { useState } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useRealtimeModule } from "../hooks/useRealtime";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Pencil, Trash2, ClipboardList } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { toast } from "sonner";

function NutritionPlansContent() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [formData, setFormData] = useState({
    horseId: "",
    planName: "",
    specialInstructions: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    targetWeight: "",
    targetBodyCondition: "",
    dailyHay: "",
    dailyConcentrates: "",
    supplements: "",
    feedingSchedule: "",
    caloriesPerDay: "",
    proteinPerDay: "",
    isActive: true,
    notes: "",
  });

  const { data: plans, refetch } = trpc.nutritionPlans.list.useQuery();
  const { data: horses } = trpc.horses.list.useQuery();
  const createMutation = trpc.nutritionPlans.create.useMutation();
  const updateMutation = trpc.nutritionPlans.update.useMutation();
  const deleteMutation = trpc.nutritionPlans.delete.useMutation();

  // Derive display list from server data; realtime events patch it in-place.
  const [realtimePatch, setRealtimePatch] = useState<any[]>([]);

  useRealtimeModule("nutritionPlans", (action, data) => {
    if (action === "created") {
      setRealtimePatch((prev) => [data, ...prev]);
      toast.success("New nutrition plan added");
    } else if (action === "updated") {
      setRealtimePatch((prev) =>
        prev.map((plan) => (plan.id === data.id ? { ...plan, ...data } : plan)),
      );
      toast.info("Nutrition plan updated");
    } else if (action === "deleted") {
      setRealtimePatch((prev) => prev.filter((plan) => plan.id !== data.id));
      toast.info("Nutrition plan deleted");
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        horseId: parseInt(formData.horseId),
        planName: formData.planName,
        specialInstructions: formData.specialInstructions || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        targetWeight: formData.targetWeight
          ? parseFloat(formData.targetWeight)
          : undefined,
        targetBodyCondition: formData.targetBodyCondition
          ? parseInt(formData.targetBodyCondition)
          : undefined,
        dailyHay: formData.dailyHay || undefined,
        dailyConcentrates: formData.dailyConcentrates || undefined,
        supplements: formData.supplements || undefined,
        feedingSchedule: formData.feedingSchedule || undefined,
        caloriesPerDay: formData.caloriesPerDay
          ? parseInt(formData.caloriesPerDay)
          : undefined,
        proteinPerDay: formData.proteinPerDay || undefined,
        isActive: formData.isActive,
        notes: formData.notes || undefined,
      };

      if (editingPlan) {
        await updateMutation.mutateAsync({ id: editingPlan.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      setIsDialogOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      toast.error("Failed to save nutrition plan");
    }
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      horseId: plan.horseId.toString(),
      planName: plan.planName,
      specialInstructions: plan.specialInstructions || "",
      startDate: plan.startDate instanceof Date
        ? plan.startDate.toISOString().split("T")[0]
        : String(plan.startDate).split("T")[0],
      endDate: plan.endDate
        ? (plan.endDate instanceof Date
            ? plan.endDate.toISOString().split("T")[0]
            : String(plan.endDate).split("T")[0])
        : "",
      targetWeight: plan.targetWeight?.toString() || "",
      targetBodyCondition: plan.targetBodyCondition?.toString() || "",
      dailyHay: plan.dailyHay || "",
      dailyConcentrates: plan.dailyConcentrates || "",
      supplements: plan.supplements || "",
      feedingSchedule: plan.feedingSchedule || "",
      caloriesPerDay: plan.caloriesPerDay?.toString() || "",
      proteinPerDay: plan.proteinPerDay || "",
      isActive: plan.isActive ?? true,
      notes: plan.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this nutrition plan?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        refetch();
      } catch (error) {
        toast.error("Failed to delete nutrition plan");
      }
    }
  };

  const resetForm = () => {
    setEditingPlan(null);
    setFormData({
      horseId: "",
      planName: "",
      specialInstructions: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      targetWeight: "",
      targetBodyCondition: "",
      dailyHay: "",
      dailyConcentrates: "",
      supplements: "",
      feedingSchedule: "",
      caloriesPerDay: "",
      proteinPerDay: "",
      isActive: true,
      notes: "",
    });
  };

  const serverPlans = plans || [];
  const realtimeIds = new Set(realtimePatch.map((p) => p.id));
  const displayPlans = [
    ...realtimePatch,
    ...serverPlans.filter((p) => !realtimeIds.has(p.id)),
  ];
  const activePlans = displayPlans.filter((plan: any) => plan.isActive);
  const inactivePlans = displayPlans.filter((plan: any) => !plan.isActive);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <PageHeader title="Nutrition Plans" />
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>Add Nutrition Plan</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? "Edit" : "Add"} Nutrition Plan
              </DialogTitle>
              <DialogDescription className="sr-only">Manage feeding plan details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="horseId">Horse *</Label>
                  <Select
                    value={formData.horseId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, horseId: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select horse" />
                    </SelectTrigger>
                    <SelectContent>
                      {horses?.map((horse: any) => (
                        <SelectItem key={horse.id} value={horse.id.toString()}>
                          {horse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="planName">Plan Name *</Label>
                  <Input
                    value={formData.planName}
                    onChange={(e) =>
                      setFormData({ ...formData, planName: e.target.value })
                    }
                    placeholder="e.g., Winter Feeding Plan"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="specialInstructions">Special Instructions</Label>
                <Textarea
                  value={formData.specialInstructions}
                  onChange={(e) =>
                    setFormData({ ...formData, specialInstructions: e.target.value })
                  }
                  placeholder="Describe the nutrition plan goals and any special instructions..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="targetWeight">Target Weight (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.targetWeight}
                    onChange={(e) =>
                      setFormData({ ...formData, targetWeight: e.target.value })
                    }
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <Label htmlFor="targetBodyCondition">
                    Target Body Condition (1-9)
                  </Label>
                  <Select
                    value={formData.targetBodyCondition}
                    onValueChange={(value) =>
                      setFormData({ ...formData, targetBodyCondition: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((score) => (
                        <SelectItem key={score} value={score.toString()}>
                          {score}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dailyHay">Daily Hay</Label>
                  <Input
                    value={formData.dailyHay}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dailyHay: e.target.value,
                      })
                    }
                    placeholder="e.g., 2 bales, 5 kg"
                  />
                </div>
                <div>
                  <Label htmlFor="dailyConcentrates">Daily Concentrates</Label>
                  <Input
                    value={formData.dailyConcentrates}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dailyConcentrates: e.target.value,
                      })
                    }
                    placeholder="e.g., 3 kg pellets, 2 scoops grain"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplements">Supplements</Label>
                  <Input
                    value={formData.supplements}
                    onChange={(e) =>
                      setFormData({ ...formData, supplements: e.target.value })
                    }
                    placeholder="e.g., Vitamins, Joint Support"
                  />
                </div>
                <div>
                  <Label htmlFor="feedingSchedule">
                    Feeding Schedule
                  </Label>
                  <Input
                    value={formData.feedingSchedule}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        feedingSchedule: e.target.value,
                      })
                    }
                    placeholder="e.g., 7:00 AM and 5:00 PM"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="caloriesPerDay">Calories Per Day</Label>
                  <Input
                    type="number"
                    value={formData.caloriesPerDay}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        caloriesPerDay: e.target.value,
                      })
                    }
                    placeholder="e.g., 16500"
                  />
                </div>
                <div>
                  <Label htmlFor="proteinPerDay">Protein Per Day</Label>
                  <Input
                    value={formData.proteinPerDay}
                    onChange={(e) =>
                      setFormData({ ...formData, proteinPerDay: e.target.value })
                    }
                    placeholder="e.g., 700 g, 12%"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">Active Plan</Label>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional notes or considerations..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPlan ? "Update" : "Create"} Plan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {displayPlans.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <ClipboardList className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No nutrition plans yet. Create a feeding plan!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {activePlans.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Active Plans</h2>
              <div className="grid gap-4">
                {activePlans.map((plan: any) => (
                  <Card key={plan.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg font-medium">
                        {plan.planName}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="default">Active</Badge>
                        {plan.targetBodyCondition && (
                          <Badge variant="outline">
                            Target BCS: {plan.targetBodyCondition}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(plan)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(plan.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="font-medium">Horse:</span>{" "}
                          {horses?.find((h: any) => h.id === plan.horseId)
                            ?.name || "Unknown"}
                        </p>
                        {plan.specialInstructions && (
                          <p className="text-sm text-muted-foreground">
                            {plan.specialInstructions}
                          </p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Start:</span>{" "}
                            {plan.startDate instanceof Date
                              ? plan.startDate.toISOString().split("T")[0]
                              : String(plan.startDate).split("T")[0]}
                          </div>
                          {plan.endDate && (
                            <div>
                              <span className="font-medium">End:</span>{" "}
                              {plan.endDate instanceof Date
                                ? plan.endDate.toISOString().split("T")[0]
                                : String(plan.endDate).split("T")[0]}
                            </div>
                          )}
                          {plan.targetWeight && (
                            <div>
                              <span className="font-medium">
                                Target Weight:
                              </span>{" "}
                              {plan.targetWeight} kg
                            </div>
                          )}
                          {plan.caloriesPerDay && (
                            <div>
                              <span className="font-medium">Calories:</span>{" "}
                              {plan.caloriesPerDay} kcal/day
                            </div>
                          )}
                          {plan.proteinPerDay && (
                            <div>
                              <span className="font-medium">Protein:</span>{" "}
                              {plan.proteinPerDay}
                            </div>
                          )}
                          {plan.dailyHay && (
                            <div>
                              <span className="font-medium">Hay:</span>{" "}
                              {plan.dailyHay}
                            </div>
                          )}
                          {plan.dailyConcentrates && (
                            <div>
                              <span className="font-medium">Concentrates:</span>{" "}
                              {plan.dailyConcentrates}
                            </div>
                          )}
                          {plan.supplements && (
                            <div>
                              <span className="font-medium">Supplements:</span>{" "}
                              {plan.supplements}
                            </div>
                          )}
                        </div>
                        {plan.notes && (
                          <p className="mt-2 text-sm text-muted-foreground italic">
                            {plan.notes}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {inactivePlans.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Inactive Plans</h2>
              <div className="grid gap-4">
                {inactivePlans.map((plan: any) => (
                  <Card key={plan.id} className="opacity-75">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg font-medium">
                        {plan.planName}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="secondary">Inactive</Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(plan)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(plan.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">
                        <span className="font-medium">Horse:</span>{" "}
                        {horses?.find((h: any) => h.id === plan.horseId)
                          ?.name || "Unknown"}
                      </p>
                      {plan.specialInstructions && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {plan.specialInstructions}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function NutritionPlans() {
  return (
    <DashboardLayout>
      <NutritionPlansContent />
    </DashboardLayout>
  );
}
