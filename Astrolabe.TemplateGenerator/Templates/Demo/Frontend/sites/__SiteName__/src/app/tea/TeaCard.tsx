import { Button } from "@astrolabe/ui";
import { TeaInfo, TeaType, MilkAmount } from "client-common/client";

interface TeaCardProps {
  tea: TeaInfo;
  isSelected: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TeaCard({
  tea,
  isSelected,
  onView,
  onEdit,
  onDelete,
}: TeaCardProps) {
  return (
    <div
      className={`p-4 bg-white shadow-md rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? "border-primary-500 ring-2 ring-primary-200"
          : "border-gray-200 hover:shadow-lg"
      }`}
      onClick={() => onView(tea.id)}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-800">
          {TeaType[tea.type]} Tea
        </h3>
        <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full">
          {MilkAmount[tea.milkAmount]}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <span className="font-medium mr-2">Sugars:</span>
          <span>{tea.numberOfSugars}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(tea.id);
          }}
          variant="outline"
          size="sm"
        >
          Edit
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(tea.id);
          }}
          variant="danger"
          size="sm"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
