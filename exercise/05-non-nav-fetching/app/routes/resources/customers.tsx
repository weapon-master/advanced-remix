import type { LoaderArgs } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import clsx from "clsx";
import { useCombobox } from "downshift";
import { useId, useState } from "react";
import { LabelText } from "~/components";
import { requireUser } from "~/session.server";
import { searchCustomers } from "~/models/customer.server";
import { useFetcher } from "@remix-run/react";
import invariant from "tiny-invariant";

export async function loader({ request }: LoaderArgs) {
  // 🐨 verify the user is logged in with requireUser
  await requireUser(request);
  // 🐨 perform the customer search with searchCustomers and the query from the request
  // and send back a json response
  const query = new URL(request.url).searchParams.get("query");
  invariant(query, "query is required");
  const customers = await searchCustomers(query); 
  return json({ customers });
}

/**
 * this component is put into this file so that the related logic can be put together
 * that's why you should pass `action: '/resources/customers'` to `submit`
 * `fetcher.submit` actually send a request that hit to this route
 * (Everything export under the resource folder should be an API endpoint)
 */
type Customer = { id: string; name: string; email: string };

export function CustomerCombobox({ error }: { error?: string | null }) {
  // 🐨 use the useFetcher hook to fetch the customers
  const customFetcher = useFetcher<{ customers: Customer[] }>();
  const id = useId();

  // 🐨 set this to the customer data you get from the fetcher (if it exists)
  const customers = customFetcher?.data?.customers ?? [];
  const [selectedCustomer, setSelectedCustomer] = useState<
    Customer | null | undefined
  >(null);

  const cb = useCombobox<Customer>({
    id,
    onSelectedItemChange: ({ selectedItem }) => {
      setSelectedCustomer(selectedItem);
    },
    items: customers,
    itemToString: (item) => (item ? item.name : ""),
    onInputValueChange: (changes) => {
      if (!changes.inputValue) return;
      customFetcher.submit(
        {
          query: changes.inputValue,
        },
        { method: "get", action: "/resources/customers" },
      );
      // 🐨 use your fetcher to submit the query and get back the customers
      // 💰 changes.inputValue is the query
      // 💰 what method do we need to set this to so it ends up in the loader?
      // 💰 what should the action URL be set to so the request is always sent to
      // this route module regardless of where this component is used?
    },
  });

  const displayMenu = cb.isOpen && customers.length > 0;

  return (
    <div className="relative">
      <input
        name="customerId"
        type="hidden"
        value={selectedCustomer?.id ?? ""}
      />
      <div className="flex flex-wrap items-center gap-1">
        <label {...cb.getLabelProps()}>
          <LabelText>Customer</LabelText>
        </label>
        {error ? (
          <em id="customer-error" className="text-d-p-xs text-red-600">
            {error}
          </em>
        ) : null}
      </div>
      <div {...cb.getComboboxProps()}>
        <input
          {...cb.getInputProps({
            className: clsx("text-lg w-full border border-gray-500 px-2 py-1", {
              "rounded-t rounded-b-0": displayMenu,
              rounded: !displayMenu,
            }),
            "aria-invalid": Boolean(error) || undefined,
            "aria-errormessage": error ? "customer-error" : undefined,
          })}
        />
      </div>
      <ul
        {...cb.getMenuProps({
          className: clsx(
            "absolute z-10 bg-white shadow-lg rounded-b w-full border border-t-0 border-gray-500 max-h-[180px] overflow-scroll",
            { hidden: !displayMenu },
          ),
        })}
      >
        {cb.isOpen
          ? customers.map((customer, index) => (
              <li
                className={clsx("cursor-pointer py-1 px-2", {
                  "bg-green-200": cb.highlightedIndex === index,
                })}
                key={customer.id}
                {...cb.getItemProps({ item: customer, index })}
              >
                {customer.name} ({customer.email})
              </li>
            ))
          : null}
      </ul>
    </div>
  );
}
