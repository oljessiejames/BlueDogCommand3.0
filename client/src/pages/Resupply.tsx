import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ShoppingCart, Package, Store as StoreIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Empty } from "@/components/Empty";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ResupplyItem, Store, InsertResupplyItem, InsertStore } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Resupply() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showNewStoreDialog, setShowNewStoreDialog] = useState(false);
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newStoreName, setNewStoreName] = useState("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    item: "",
    quantity: "",
    category: "",
    storeId: "",
  });

  const { data: stores = [], isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ['/api/stores'],
  });

  const queryParams = new URLSearchParams();
  if (storeFilter !== "all") queryParams.set("storeId", storeFilter);
  if (categoryFilter !== "all") queryParams.set("category", categoryFilter);

  const { data: items = [], isLoading: itemsLoading } = useQuery<ResupplyItem[]>({
    queryKey: ['/api/resupply', storeFilter, categoryFilter],
    queryFn: () => fetch(`/api/resupply?${queryParams}`).then(r => r.json()),
  });

  const categories = Array.from(new Set(items.map(item => item.category).filter(Boolean)));

  const createItemMutation = useMutation({
    mutationFn: async (data: InsertResupplyItem) =>
      apiRequest("POST", "/api/resupply", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resupply'] });
      setShowAddDialog(false);
      setFormData({ item: "", quantity: "", category: "", storeId: "" });
      toast({
        title: "Item added",
        description: "Resupply item added to the list",
      });
    },
  });

  const createStoreMutation = useMutation({
    mutationFn: async (data: InsertStore) => {
      const res = await apiRequest("POST", "/api/stores", data);
      return res.json() as Promise<Store>;
    },
    onSuccess: (newStore: Store) => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      setShowNewStoreDialog(false);
      setNewStoreName("");
      setFormData({ ...formData, storeId: newStore.id });
      toast({
        title: "Store added",
        description: `${newStore.name} has been added to your stores`,
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/resupply/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resupply'] });
      setDeletingId(null);
      toast({
        title: "Item removed",
        description: "Resupply item has been removed",
      });
    },
  });

  const togglePurchasedMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/resupply/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resupply'] });
      toast({
        title: "Item purchased",
        description: "Item marked as purchased and removed from list",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item || !formData.quantity || !formData.category || !formData.storeId) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in all fields",
      });
      return;
    }
    createItemMutation.mutate(formData);
  };

  const handleAddStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) {
      toast({
        variant: "destructive",
        title: "Missing store name",
        description: "Please enter a store name",
      });
      return;
    }
    createStoreMutation.mutate({ name: newStoreName.trim() });
  };

  const isLoading = itemsLoading || storesLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-[#041BB3]" />
          <h1 className="text-2xl font-bold">Resupply List</h1>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          data-testid="button-add-item"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-48" data-testid="select-store-filter">
            <SelectValue placeholder="Filter by store" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stores</SelectItem>
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48" data-testid="select-category-filter">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AnimatePresence mode="popLayout">
        {items.length === 0 ? (
          <Empty
            icon={Package}
            title="No items in resupply list"
            description="Add items you need to purchase"
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const store = stores.find(s => s.id === item.storeId);
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="p-4 hover-elevate" data-testid={`card-item-${item.id}`}>
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => togglePurchasedMutation.mutate(item.id)}
                        data-testid={`checkbox-purchased-${item.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg" data-testid={`text-item-${item.id}`}>
                            {item.item}
                          </h3>
                          <span className="text-sm text-muted-foreground" data-testid={`text-quantity-${item.id}`}>
                            × {item.quantity}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1" data-testid={`text-category-${item.id}`}>
                            <Package className="h-3 w-3" />
                            {item.category}
                          </span>
                          {store && (
                            <span className="flex items-center gap-1" data-testid={`text-store-${item.id}`}>
                              <StoreIcon className="h-3 w-3" />
                              {store.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingId(item.id)}
                        data-testid={`button-delete-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent data-testid="dialog-add-item">
          <DialogHeader>
            <DialogTitle>Add Resupply Item</DialogTitle>
            <DialogDescription>
              Add a new item to your shopping list
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="item">Item</Label>
              <Input
                id="item"
                value={formData.item}
                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                placeholder="e.g., MRE Pack Alpha"
                data-testid="input-item"
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="e.g., 24"
                data-testid="input-quantity"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Food Supplies"
                data-testid="input-category"
              />
            </div>
            <div>
              <Label htmlFor="store">Store</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.storeId}
                  onValueChange={(value) => setFormData({ ...formData, storeId: value })}
                >
                  <SelectTrigger className="flex-1" data-testid="select-store">
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewStoreDialog(true)}
                  data-testid="button-add-store"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createItemMutation.isPending}
                data-testid="button-submit"
              >
                {createItemMutation.isPending ? "Adding..." : "Add Item"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewStoreDialog} onOpenChange={setShowNewStoreDialog}>
        <DialogContent data-testid="dialog-add-store">
          <DialogHeader>
            <DialogTitle>Add Store</DialogTitle>
            <DialogDescription>
              Add a new store to your list
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStore} className="space-y-4">
            <div>
              <Label htmlFor="storeName">Store Name</Label>
              <Input
                id="storeName"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                placeholder="e.g., Base Commissary"
                data-testid="input-store-name"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewStoreDialog(false)}
                data-testid="button-cancel-store"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createStoreMutation.isPending}
                data-testid="button-submit-store"
              >
                {createStoreMutation.isPending ? "Adding..." : "Add Store"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this item from your resupply list?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteItemMutation.mutate(deletingId)}
              data-testid="button-confirm-delete"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
