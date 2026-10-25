/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  Button,
  Input,
  Textarea,
  Select,
  Checkbox,
  Radio,
  Switch,
  Tabs,
  Badge,
  Status,
  Surface,
  Table,
  Dialog,
  Drawer,
  Sheet,
  Toast,
  Progress,
  Skeleton,
  EmptyState,
  PageHeader,
  Stat,
  Icon,
} from "@/components/ui";

describe("UI Primitives Suite", () => {
  describe("Button Primitive", () => {
    it("renders primary variant and handles click", () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Save Plan</Button>);
      const btn = screen.getByRole("button", { name: "Save Plan" });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("renders loading state with spinner and aria-busy", () => {
      render(<Button isLoading>Generating</Button>);
      const btn = screen.getByRole("button");
      expect(btn).toHaveAttribute("aria-busy", "true");
      expect(btn).toBeDisabled();
      expect(screen.getByText("Loading")).toHaveClass("sr-only");
    });

    it("renders disabled state with aria-disabled", () => {
      render(<Button disabled>Cannot click</Button>);
      const btn = screen.getByRole("button", { name: "Cannot click" });
      expect(btn).toHaveAttribute("aria-disabled", "true");
      expect(btn).toBeDisabled();
    });

    it("renders icon-only button with accessible aria-label", () => {
      render(
        <Button isIconOnly aria-label="Delete item">
          <Icon name="trash" />
        </Button>
      );
      expect(screen.getByRole("button", { name: "Delete item" })).toBeInTheDocument();
    });
  });

  describe("Input & Textarea Primitives", () => {
    it("associates label and helper text with Input", () => {
      render(
        <Input
          label="Event Name"
          helperText="Give your gathering a memorable title"
          defaultValue="Summer Gala"
        />
      );
      const input = screen.getByLabelText("Event Name");
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("Summer Gala");
      expect(
        screen.getByText("Give your gathering a memorable title")
      ).toBeInTheDocument();
    });

    it("renders Input error state with aria-invalid and alert", () => {
      render(
        <Input
          label="Budget"
          errorMessage="Budget must be greater than zero"
          isInvalid
        />
      );
      const input = screen.getByLabelText("Budget");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Budget must be greater than zero"
      );
    });

    it("renders Textarea with charCount tracker", () => {
      render(
        <Textarea
          label="Description"
          charCount={50}
          maxCharCount={200}
          defaultValue="Brief summary"
        />
      );
      expect(screen.getByLabelText("Description")).toBeInTheDocument();
      expect(screen.getByText("50 / 200")).toBeInTheDocument();
    });
  });

  describe("Select Primitive", () => {
    const options = [
      { value: "wedding", label: "Wedding" },
      { value: "birthday", label: "Birthday" },
      { value: "community", label: "Community" },
    ];

    it("opens listbox and selects option via click", () => {
      const handleChange = jest.fn();
      render(
        <Select
          label="Event Type"
          value="wedding"
          options={options}
          onChange={handleChange}
        />
      );
      const trigger = screen.getByRole("button", { name: /Event Type/i });
      expect(trigger).toHaveAttribute("aria-expanded", "false");

      // Open select
      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");

      const listbox = screen.getByRole("listbox");
      expect(listbox).toBeInTheDocument();

      const optionItems = screen.getAllByRole("option");
      expect(optionItems).toHaveLength(3);

      // Click option
      fireEvent.click(optionItems[1]!);
      expect(handleChange).toHaveBeenCalledWith("birthday");
    });

    it("navigates options via keyboard ArrowDown, ArrowUp, Enter, and Escape", () => {
      const handleChange = jest.fn();
      render(
        <Select
          label="Event Type"
          value="wedding"
          options={options}
          onChange={handleChange}
        />
      );
      const trigger = screen.getByRole("button", { name: /Event Type/i });

      // Open on ArrowDown
      fireEvent.keyDown(trigger, { key: "ArrowDown" });
      expect(trigger).toHaveAttribute("aria-expanded", "true");

      // Navigate down and select via Enter
      fireEvent.keyDown(trigger, { key: "ArrowDown" });
      fireEvent.keyDown(trigger, { key: "Enter" });
      expect(handleChange).toHaveBeenCalled();

      // Open on Space and close on Escape
      fireEvent.keyDown(trigger, { key: " " });
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      fireEvent.keyDown(trigger, { key: "Escape" });
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("Checkbox, Radio & Switch Primitives", () => {
    it("renders Checkbox with label and helperText", () => {
      const handleChange = jest.fn();
      render(
        <Checkbox
          label="Accept terms"
          helperText="Must agree before proceeding"
          checked={false}
          onChange={handleChange}
        />
      );
      const box = screen.getByLabelText(/Accept terms/i);
      expect(box).not.toBeChecked();
      expect(screen.getByText("Must agree before proceeding")).toBeInTheDocument();
      fireEvent.click(box);
      expect(handleChange).toHaveBeenCalled();
    });

    it("renders Radio with label and helperText", () => {
      const handleChange = jest.fn();
      render(
        <Radio
          label="Option A"
          helperText="Detailed description of option A"
          checked={false}
          onChange={handleChange}
        />
      );
      const radio = screen.getByLabelText(/Option A/i);
      expect(radio).not.toBeChecked();
      expect(screen.getByText("Detailed description of option A")).toBeInTheDocument();
      fireEvent.click(radio);
      expect(handleChange).toHaveBeenCalled();
    });

    it("toggles Switch with role switch", () => {
      const handleChange = jest.fn();
      render(
        <Switch
          label="Sandbox Mode"
          helperText="Simulate scenarios safely"
          checked={false}
          onChange={handleChange}
        />
      );
      const sw = screen.getByRole("switch");
      expect(sw).toHaveAttribute("aria-checked", "false");
      fireEvent.click(sw);
      expect(handleChange).toHaveBeenCalledWith(true);
    });
  });

  describe("Tabs Primitive", () => {
    const tabs = [
      { id: "overview", label: "Overview", icon: "sparkles" as const },
      { id: "budget", label: "Budget", badge: "$25k" },
      { id: "timeline", label: "Timeline" },
    ];

    it("renders underline tablist with selected tab and handles keyboard navigation", () => {
      const handleChange = jest.fn();
      render(
        <Tabs tabs={tabs} activeTab="overview" onChange={handleChange} variant="underline" />
      );
      const tablist = screen.getByRole("tablist");
      expect(tablist).toBeInTheDocument();

      const tabElements = screen.getAllByRole("tab");
      expect(tabElements[0]).toHaveAttribute("aria-selected", "true");
      expect(tabElements[1]).toHaveAttribute("aria-selected", "false");

      fireEvent.click(tabElements[1]!);
      expect(handleChange).toHaveBeenCalledWith("budget");

      // Test keyboard arrow navigation
      fireEvent.keyDown(tabElements[0]!, { key: "ArrowRight" });
      expect(handleChange).toHaveBeenCalledWith("budget");

      fireEvent.keyDown(tabElements[0]!, { key: "ArrowLeft" });
      expect(handleChange).toHaveBeenCalledWith("timeline");
    });

    it("renders segmented variant with badge and icons", () => {
      const handleChange = jest.fn();
      render(
        <Tabs tabs={tabs} activeTab="budget" onChange={handleChange} variant="segmented" />
      );
      expect(screen.getByText("$25k")).toBeInTheDocument();
      const overviewBtn = screen.getByRole("tab", { name: /Overview/i });
      fireEvent.click(overviewBtn);
      expect(handleChange).toHaveBeenCalledWith("overview");
    });
  });

  describe("Badge & Status Primitives", () => {
    it("renders Badge variants with icon", () => {
      render(
        <Badge variant="success" icon="check">
          100% Allocated
        </Badge>
      );
      expect(screen.getByText("100% Allocated")).toBeInTheDocument();
    });

    it("renders Status indicator", () => {
      render(<Status status="warning" label="Over Budget" />);
      expect(screen.getByText("Over Budget")).toBeInTheDocument();
    });
  });

  describe("Table Primitive", () => {
    const columns = [
      { key: "category", header: "Category" },
      { key: "amount", header: "Amount" },
    ];
    const data = [
      { category: "Catering", amount: "$10,000" },
      { category: "Venue", amount: "$8,000" },
    ];

    it("renders desktop and mobile stacked items", () => {
      render(
        <Table
          columns={columns}
          data={data}
          keyExtractor={(r) => r.category}
          caption="Budget Table"
        />
      );
      expect(screen.getAllByText("Catering").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("$10,000").length).toBeGreaterThanOrEqual(1);
    });

    it("renders empty state when data array is empty", () => {
      render(
        <Table
          columns={columns}
          data={[] as Array<{ category: string; amount: string }>}
          keyExtractor={(r) => r.category}
          caption="Empty Table"
        />
      );
      expect(screen.getByText(/No items to display/i)).toBeInTheDocument();
    });
  });

  describe("Dialog, Drawer & Sheet Overlays", () => {
    it("renders dialog with header, footer and handles close & escape", () => {
      const handleClose = jest.fn();
      render(
        <Dialog
          isOpen={true}
          onClose={handleClose}
          title="Confirm Reset"
          description="Are you sure you want to delete all data?"
          footer={<Button onClick={handleClose}>Confirm</Button>}
        >
          <p>This action cannot be undone.</p>
        </Dialog>
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Confirm Reset")).toBeInTheDocument();
      expect(screen.getByText("Confirm")).toBeInTheDocument();

      const closeBtn = screen.getByRole("button", { name: "Close dialog" });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalled();

      // Escape key
      fireEvent.keyDown(document, { key: "Escape" });
      expect(handleClose).toHaveBeenCalledTimes(2);
    });

    it("does not render dialog when isOpen is false", () => {
      render(
        <Dialog isOpen={false} onClose={() => {}} title="Hidden">
          <p>Hidden content</p>
        </Dialog>
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders Drawer and handles close", () => {
      const handleClose = jest.fn();
      render(
        <Drawer
          isOpen={true}
          onClose={handleClose}
          title="Copilot Assistant"
          description="Contextual event plan advice"
        >
          <p>Copilot content</p>
        </Drawer>
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Copilot Assistant")).toBeInTheDocument();

      const closeBtn = screen.getByRole("button", { name: "Close drawer" });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalled();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(handleClose).toHaveBeenCalledTimes(2);
    });

    it("renders Sheet and handles close", () => {
      const handleClose = jest.fn();
      render(
        <Sheet
          isOpen={true}
          onClose={handleClose}
          title="Event Settings"
          description="Adjust preferences"
        >
          <p>Sheet options</p>
        </Sheet>
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Event Settings")).toBeInTheDocument();

      const closeBtn = screen.getByRole("button", { name: "Close sheet" });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalled();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(handleClose).toHaveBeenCalledTimes(2);
    });
  });

  describe("Toast & Progress & Feedback Primitives", () => {
    it("renders Toast with undo button", () => {
      const handleUndo = jest.fn();
      const handleDismiss = jest.fn();
      render(
        <Toast
          id="t1"
          message="Idea dismissed"
          onUndo={handleUndo}
          onDismiss={handleDismiss}
        />
      );
      expect(screen.getByRole("status")).toHaveTextContent("Idea dismissed");
      const undoBtn = screen.getByRole("button", { name: "Undo" });
      fireEvent.click(undoBtn);
      expect(handleUndo).toHaveBeenCalled();
    });

    it("renders Progress bar with aria-valuenow", () => {
      render(<Progress value={75} max={100} label="Tasks completed" showPercent />);
      const pb = screen.getByRole("progressbar");
      expect(pb).toHaveAttribute("aria-valuenow", "75");
      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("renders EmptyState with action button", () => {
      const handleAction = jest.fn();
      render(
        <EmptyState
          title="No vendors yet"
          description="Add your first vendor to start tracking quotes."
          actionLabel="Add Vendor"
          onAction={handleAction}
        />
      );
      expect(screen.getByText("No vendors yet")).toBeInTheDocument();
      const btn = screen.getByRole("button", { name: "Add Vendor" });
      fireEvent.click(btn);
      expect(handleAction).toHaveBeenCalled();
    });

    it("renders PageHeader and Stat", () => {
      render(
        <PageHeader
          title="Budget Ledger"
          subtitle="Real-time penny-accurate allocation"
        />
      );
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Budget Ledger"
      );

      render(<Stat label="Total Budget" value="$35,000.00" />);
      expect(screen.getByText("Total Budget")).toBeInTheDocument();
      expect(screen.getByText("$35,000.00")).toBeInTheDocument();
    });

    it("renders Surface and Skeleton primitives", () => {
      const { container } = render(
        <Surface variant="elevated" eventTint="wedding" className="test-surface">
          <Skeleton variant="text" />
          <Skeleton variant="rectangular" className="h-20" />
        </Surface>
      );
      expect(container.querySelector(".test-surface")).toBeInTheDocument();
      expect(container.querySelectorAll(".animate-pulse")).toHaveLength(2);
    });
  });

  describe("Icon Primitive", () => {
    it("renders all defined icons without crashing", () => {
      const icons = [
        "calendar", "clock", "users", "currency", "location",
        "sparkles", "check", "alert", "info", "x",
        "chevron-down", "chevron-right", "chevron-up", "arrow-left", "arrow-right",
        "edit", "trash", "share", "download", "plus",
        "search", "menu", "settings", "undo", "redo",
        "wedding", "birthday", "community", "shield", "clipboard",
        "chart", "filter", "copy", "external", "spinner",
        "alert-triangle", "file", "coffee", "music", "sliders",
      ] as const;

      const { container } = render(
        <div>
          {icons.map((name) => (
            <Icon key={name} name={name} size={16} aria-label={name} />
          ))}
        </div>
      );
      expect(container.querySelectorAll("svg")).toHaveLength(icons.length);
    });

    it("renders icon with aria-label as role img", () => {
      render(<Icon name="check" aria-label="Completed" />);
      expect(screen.getByRole("img", { name: "Completed" })).toBeInTheDocument();
    });
  });
});
