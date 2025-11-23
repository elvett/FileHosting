import { columns, File } from "./columns";
import { DataTable } from "./data-table";

async function getData(): Promise<File[]> {
  // Fetch data from your API here.
  return [
    {
      name: "a728ed52f",
      size: 100,
      privacy: false,
      type: "m@example.com",
      date: "12",
    },
    {
      name: "v728ed52f",
      size: 1000,
      privacy: false,
      type: "m@example.com",
      date: "12",
    },
    {
      name: "c728ed52f",
      size: 100,
      privacy: true,
      type: "m@example.com",
      date: "12",
    },
    // ...
  ];
}

export default async function DemoPage() {
  const data = await getData();

  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={data} />
    </div>
  );
}
