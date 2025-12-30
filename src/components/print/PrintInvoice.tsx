import type { SalesOrder, WorkOrder, SalesOrderLine, WorkOrderPartLine, WorkOrderLaborLine, Customer, Unit, Part } from '@/types';

interface PrintSalesOrderProps {
  order: SalesOrder;
  lines: SalesOrderLine[];
  customer: Customer | undefined;
  unit: Unit | undefined;
  parts: Part[];
  shopName: string;
}

export function PrintSalesOrder({ order, lines, customer, unit, parts, shopName }: PrintSalesOrderProps) {
  const pickListItems = lines
    .map((line) => {
      const part = parts.find((p) => p.id === line.part_id);
      return {
        id: line.id,
        quantity: line.quantity,
        partNumber: part?.part_number || '-',
        description: part?.description || '-',
        bin: part?.bin_location || '—',
      };
    })
    .sort((a, b) => {
      const binA = a.bin === '—' ? 'ZZZ' : a.bin;
      const binB = b.bin === '—' ? 'ZZZ' : b.bin;
      if (binA.localeCompare(binB) !== 0) return binA.localeCompare(binB);
      if (a.partNumber.localeCompare(b.partNumber) !== 0) return a.partNumber.localeCompare(b.partNumber);
      return a.description.localeCompare(b.description);
    });

  return (
    <div className="print-invoice hidden print:block bg-white text-black p-8 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b border-gray-300 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{shopName}</h1>
          <p className="text-gray-600 mt-1">Sales Invoice</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-mono font-bold">{order.order_number}</p>
          <p className="text-gray-600">{new Date(order.created_at).toLocaleDateString()}</p>
          {order.invoiced_at && (
            <p className="text-sm text-gray-500">
              Invoiced: {new Date(order.invoiced_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-8 grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</h2>
          <p className="font-semibold text-gray-900">{customer?.company_name || '-'}</p>
          {customer?.contact_name && <p className="text-gray-700">{customer.contact_name}</p>}
          {customer?.address && <p className="text-gray-600 text-sm">{customer.address}</p>}
          {customer?.phone && <p className="text-gray-600 text-sm">{customer.phone}</p>}
        </div>
        {unit && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Unit</h2>
            <p className="font-semibold text-gray-900">{unit.unit_name}</p>
            {unit.vin && <p className="text-gray-600 text-sm font-mono">VIN: {unit.vin}</p>}
            {(unit.year || unit.make || unit.model) && (
              <p className="text-gray-600 text-sm">
                {[unit.year, unit.make, unit.model].filter(Boolean).join(' ')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pick List */}
      {pickListItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Pick List</h3>
          <table className="w-full mb-4">
            <tbody>
              {pickListItems.reduce<JSX.Element[]>((rows, item, index) => {
                const prev = pickListItems[index - 1];
                const isNewBin = !prev || prev.bin !== item.bin;
                if (isNewBin) {
                  rows.push(
                    <tr key={`bin-${item.bin}-${index}`} className="bg-gray-100">
                      <td colSpan={4} className="py-1 px-2 text-xs font-semibold text-gray-700">
                        Bin: {item.bin}
                      </td>
                    </tr>
                  );
                }
                rows.push(
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-1 px-2 text-sm text-right w-16">{item.quantity}</td>
                    <td className="py-1 px-2 text-sm font-mono">{item.partNumber}</td>
                    <td className="py-1 px-2 text-sm">{item.description}</td>
                    <td className="py-1 px-2 text-sm">{item.bin}</td>
                  </tr>
                );
                return rows;
              }, [])}
            </tbody>
          </table>
        </div>
      )}

      {/* Line Items */}
      <table className="w-full mb-8">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="text-left py-2 text-sm font-semibold text-gray-700">Part #</th>
            <th className="text-left py-2 text-sm font-semibold text-gray-700">Description</th>
            <th className="text-left py-2 text-sm font-semibold text-gray-700">Bin</th>
            <th className="text-right py-2 text-sm font-semibold text-gray-700">Qty</th>
            <th className="text-right py-2 text-sm font-semibold text-gray-700">Unit Price</th>
            <th className="text-right py-2 text-sm font-semibold text-gray-700">Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const part = parts.find((p) => p.id === line.part_id);
            return (
              <tr key={line.id} className="border-b border-gray-200">
                <td className="py-2 font-mono text-sm">{part?.part_number || '-'}</td>
                <td className="py-2 text-sm">{part?.description || '-'}</td>
                <td className="py-2 text-sm">{part?.bin_location || '—'}</td>
                <td className="py-2 text-right text-sm">{line.quantity}</td>
                <td className="py-2 text-right text-sm">${line.unit_price.toFixed(2)}</td>
                <td className="py-2 text-right text-sm font-medium">${line.line_total.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64">
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Subtotal:</span>
            <span>${order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Tax ({order.tax_rate}%):</span>
            <span>${order.tax_amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 border-t-2 border-gray-900 font-bold text-lg">
            <span>Total:</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mt-8 pt-4 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Notes</h2>
          <p className="text-gray-700 text-sm whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-4 border-t border-gray-200 text-center text-gray-500 text-sm">
        <p>Thank you for your business!</p>
      </div>
    </div>
  );
}

interface PrintWorkOrderProps {
  order: WorkOrder;
  partLines: WorkOrderPartLine[];
  laborLines: WorkOrderLaborLine[];
  customer: Customer | undefined;
  unit: Unit | undefined;
  parts: Part[];
  shopName: string;
}

export function PrintWorkOrder({ order, partLines, laborLines, customer, unit, parts, shopName }: PrintWorkOrderProps) {
  const pickListItems = partLines
    .map((line) => {
      const part = parts.find((p) => p.id === line.part_id);
      return {
        id: line.id,
        quantity: line.quantity,
        partNumber: part?.part_number || '-',
        description: part?.description || '-',
        bin: part?.bin_location || '—',
      };
    })
    .sort((a, b) => {
      const binA = a.bin === '—' ? 'ZZZ' : a.bin;
      const binB = b.bin === '—' ? 'ZZZ' : b.bin;
      if (binA.localeCompare(binB) !== 0) return binA.localeCompare(binB);
      if (a.partNumber.localeCompare(b.partNumber) !== 0) return a.partNumber.localeCompare(b.partNumber);
      return a.description.localeCompare(b.description);
    });

  return (
    <div className="print-invoice hidden print:block bg-white text-black p-8 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b border-gray-300 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{shopName}</h1>
          <p className="text-gray-600 mt-1">Work Order / Invoice</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-mono font-bold">{order.order_number}</p>
          <p className="text-gray-600">{new Date(order.created_at).toLocaleDateString()}</p>
          {order.invoiced_at && (
            <p className="text-sm text-gray-500">
              Invoiced: {new Date(order.invoiced_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Customer & Unit Info */}
      <div className="mb-8 grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Customer</h2>
          <p className="font-semibold text-gray-900">{customer?.company_name || '-'}</p>
          {customer?.contact_name && <p className="text-gray-700">{customer.contact_name}</p>}
          {customer?.address && <p className="text-gray-600 text-sm">{customer.address}</p>}
          {customer?.phone && <p className="text-gray-600 text-sm">{customer.phone}</p>}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Unit / Equipment</h2>
          <p className="font-semibold text-gray-900">{unit?.unit_name || '-'}</p>
          {unit?.vin && <p className="text-gray-600 text-sm font-mono">VIN: {unit.vin}</p>}
          {(unit?.year || unit?.make || unit?.model) && (
            <p className="text-gray-600 text-sm">
              {[unit?.year, unit?.make, unit?.model].filter(Boolean).join(' ')}
            </p>
          )}
          {unit?.mileage && <p className="text-gray-600 text-sm">Mileage: {unit.mileage.toLocaleString()}</p>}
          {unit?.hours && <p className="text-gray-600 text-sm">Hours: {unit.hours.toLocaleString()}</p>}
        </div>
      </div>

      {/* Labor Items */}
      {laborLines.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-700 uppercase mb-2">Labor</h2>
          <table className="w-full mb-6">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-2 text-sm font-semibold text-gray-700">Description</th>
                <th className="text-right py-2 text-sm font-semibold text-gray-700">Hours</th>
                <th className="text-right py-2 text-sm font-semibold text-gray-700">Rate</th>
                <th className="text-right py-2 text-sm font-semibold text-gray-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {laborLines.map((line) => (
                <tr key={line.id} className="border-b border-gray-200">
                  <td className="py-2 text-sm">{line.description}</td>
                  <td className="py-2 text-right text-sm">{line.hours}</td>
                  <td className="py-2 text-right text-sm">${line.rate.toFixed(2)}</td>
                  <td className="py-2 text-right text-sm font-medium">${line.line_total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Parts Items */}
      {partLines.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-700 uppercase mb-2">Parts</h2>
          {pickListItems.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Pick List</h3>
              <table className="w-full mb-2">
                <tbody>
                  {pickListItems.reduce<JSX.Element[]>((rows, item, index) => {
                    const prev = pickListItems[index - 1];
                    const isNewBin = !prev || prev.bin !== item.bin;
                    if (isNewBin) {
                      rows.push(
                        <tr key={`bin-${item.bin}-${index}`} className="bg-gray-100">
                          <td colSpan={4} className="py-1 px-2 text-xs font-semibold text-gray-700">
                            Bin: {item.bin}
                          </td>
                        </tr>
                      );
                    }
                    rows.push(
                      <tr key={item.id} className="border-b border-gray-200">
                        <td className="py-1 px-2 text-sm text-right w-16">{item.quantity}</td>
                        <td className="py-1 px-2 text-sm font-mono">{item.partNumber}</td>
                        <td className="py-1 px-2 text-sm">{item.description}</td>
                        <td className="py-1 px-2 text-sm">{item.bin}</td>
                      </tr>
                    );
                    return rows;
                  }, [])}
                </tbody>
              </table>
            </div>
          )}
          <table className="w-full mb-6">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-2 text-sm font-semibold text-gray-700">Part #</th>
                <th className="text-left py-2 text-sm font-semibold text-gray-700">Description</th>
                <th className="text-left py-2 text-sm font-semibold text-gray-700">Bin</th>
                <th className="text-right py-2 text-sm font-semibold text-gray-700">Qty</th>
                <th className="text-right py-2 text-sm font-semibold text-gray-700">Unit Price</th>
                <th className="text-right py-2 text-sm font-semibold text-gray-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {partLines.map((line) => {
                const part = parts.find((p) => p.id === line.part_id);
                return (
                  <tr key={line.id} className="border-b border-gray-200">
                    <td className="py-2 font-mono text-sm">{part?.part_number || '-'}</td>
                    <td className="py-2 text-sm">{part?.description || '-'}</td>
                    <td className="py-2 text-sm">{part?.bin_location || '—'}</td>
                    <td className="py-2 text-right text-sm">{line.quantity}</td>
                    <td className="py-2 text-right text-sm">${line.unit_price.toFixed(2)}</td>
                    <td className="py-2 text-right text-sm font-medium">${line.line_total.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64">
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Labor:</span>
            <span>${order.labor_subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Parts:</span>
            <span>${order.parts_subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1 border-t border-gray-200">
            <span className="text-gray-600">Subtotal:</span>
            <span>${order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Tax ({order.tax_rate}%):</span>
            <span>${order.tax_amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 border-t-2 border-gray-900 font-bold text-lg">
            <span>Total:</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mt-8 pt-4 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Notes</h2>
          <p className="text-gray-700 text-sm whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-4 border-t border-gray-200 text-center text-gray-500 text-sm">
        <p>Thank you for your business!</p>
      </div>
    </div>
  );
}
