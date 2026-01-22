import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    shipEngineSettingsApi,
    type ShipEngineSettings,
    type ShipEngineCarrier,
    type ShipFromAddress,
} from '../../api/shipping';

interface Props {
    onMessage?: (message: string, isError?: boolean) => void;
}

export function ShipEngineSettingsSection({ onMessage }: Props) {
    const [settings, setSettings] = useState<ShipEngineSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    // Form state
    const [apiKey, setApiKey] = useState('');
    const [isSandbox, setIsSandbox] = useState(true);
    const [carriers, setCarriers] = useState<ShipEngineCarrier[]>([]);
    const [defaultCarrierId, setDefaultCarrierId] = useState('');
    const [shipFromAddress, setShipFromAddress] = useState<ShipFromAddress>({});

    // Discovered carriers from test
    const [discoveredCarriers, setDiscoveredCarriers] = useState<Array<{ carrierId: string; name: string; carrierCode: string }>>([]);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const { settings: data } = await shipEngineSettingsApi.get();
            setSettings(data);
            setIsSandbox(data.isSandbox);
            setCarriers(data.carriers || []);
            setDefaultCarrierId(data.defaultCarrierId || '');
            setShipFromAddress(data.shipFromAddress || {});
        } catch (error) {
            console.error('Failed to load settings:', error);
            onMessage?.('Failed to load ShipEngine settings', true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: Parameters<typeof shipEngineSettingsApi.update>[0] = {
                isSandbox,
                carriers,
                defaultCarrierId,
                shipFromAddress,
            };

            // Only include API key if provided (non-empty)
            if (apiKey.trim()) {
                payload.apiKey = apiKey.trim();
            }

            const { settings: updated, message } = await shipEngineSettingsApi.update(payload);
            setSettings(updated);
            setApiKey(''); // Clear the input after save
            onMessage?.(message || 'Settings saved successfully');
        } catch (error) {
            console.error('Failed to save settings:', error);
            onMessage?.('Failed to save settings', true);
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setDiscoveredCarriers([]);
        try {
            const result = await shipEngineSettingsApi.testConnection();
            if (result.success) {
                onMessage?.('Connection successful! ' + (result.carriers?.length || 0) + ' carriers found.');
                setDiscoveredCarriers(result.carriers || []);
            } else {
                onMessage?.(result.message || 'Connection failed', true);
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            onMessage?.('Connection test failed', true);
        } finally {
            setTesting(false);
        }
    };

    const addDiscoveredCarrier = (carrier: { carrierId: string; name: string; carrierCode: string }) => {
        const exists = carriers.some((c) => c.carrierId === carrier.carrierId);
        if (exists) {
            onMessage?.('This carrier is already added', true);
            return;
        }

        setCarriers([
            ...carriers,
            {
                name: carrier.name,
                carrierId: carrier.carrierId,
                carrierCode: carrier.carrierCode,
                isEnabled: true,
            },
        ]);
        onMessage?.(`Added ${carrier.name}`);
    };

    const removeCarrier = (carrierId: string) => {
        setCarriers(carriers.filter((c) => c.carrierId !== carrierId));
        if (defaultCarrierId === carrierId) {
            setDefaultCarrierId('');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div>
                <h2 className="text-2xl font-bold text-slate-900">ShipEngine Settings</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Configure your ShipEngine API key and carriers for automated shipping label creation and tracking.
                </p>
            </div>

            {/* API Key Section */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">API Configuration</h3>

                <div className="grid gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            API Key
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={settings?.hasApiKey ? '••••••••' + (settings.apiKeyMasked || '') : 'Enter your ShipEngine API key'}
                                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                                type="button"
                                onClick={handleTestConnection}
                                disabled={testing || !settings?.hasApiKey}
                                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                            >
                                {testing ? 'Testing...' : 'Test Connection'}
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            Get your API key from{' '}
                            <a href="https://dashboard.shipengine.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                dashboard.shipengine.com
                            </a>
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="sandbox"
                            checked={isSandbox}
                            onChange={(e) => setIsSandbox(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="sandbox" className="text-sm text-slate-700">
                            Sandbox Mode (for testing with TEST_ API keys)
                        </label>
                    </div>
                </div>
            </div>

            {/* Discovered Carriers from Test */}
            {discoveredCarriers.length > 0 && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-6">
                    <h3 className="text-lg font-semibold text-green-800 mb-4">
                        Discovered Carriers ({discoveredCarriers.length})
                    </h3>
                    <p className="text-sm text-green-700 mb-4">
                        These carriers are available in your ShipEngine account. Click to add them.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {discoveredCarriers.map((carrier) => {
                            const alreadyAdded = carriers.some((c) => c.carrierId === carrier.carrierId);
                            return (
                                <button
                                    key={carrier.carrierId}
                                    type="button"
                                    onClick={() => addDiscoveredCarrier(carrier)}
                                    disabled={alreadyAdded}
                                    className={`flex items-center justify-between rounded-lg border p-3 text-left transition ${alreadyAdded
                                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'border-green-300 bg-white hover:bg-green-100 text-slate-800'
                                        }`}
                                >
                                    <div>
                                        <div className="font-medium">{carrier.name}</div>
                                        <div className="text-xs text-slate-500">{carrier.carrierId}</div>
                                    </div>
                                    {alreadyAdded ? (
                                        <span className="text-xs text-slate-400">Added</span>
                                    ) : (
                                        <span className="text-xs text-green-600">+ Add</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}


            {/* Carrier IDs Section */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Carrier IDs</h3>
                <p className="text-sm text-slate-600 mb-4">
                    Add your ShipEngine carrier IDs. You can find these in your ShipEngine dashboard, or test your connection above to auto-discover them.
                </p>

                {/* Carrier ID List */}
                <div className="space-y-3">
                    {(carriers.length === 0 ? [{ carrierId: '', name: '', carrierCode: '', isEnabled: true }] : carriers).map((carrier, index) => {
                        const isLastItem = index === carriers.length - 1 || (carriers.length === 0 && index === 0);
                        const isEmpty = !carrier.carrierId.trim();

                        return (
                            <div key={carrier.carrierId || `new-${index}`} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={carrier.carrierId}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        if (carriers.length === 0) {
                                            // First carrier being added
                                            if (newValue.trim()) {
                                                setCarriers([{
                                                    name: newValue.trim(),
                                                    carrierId: newValue.trim(),
                                                    carrierCode: '',
                                                    isEnabled: true,
                                                }]);
                                            }
                                        } else {
                                            // Update existing carrier
                                            setCarriers(carriers.map((c, i) =>
                                                i === index
                                                    ? { ...c, carrierId: newValue, name: newValue || c.name }
                                                    : c
                                            ));
                                        }
                                    }}
                                    placeholder="Enter carrier ID (e.g., se-4755367)"
                                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                />

                                {/* Remove button - show for all except when it's the only empty field */}
                                {!(carriers.length <= 1 && isEmpty) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (carriers.length <= 1) {
                                                setCarriers([]);
                                            } else {
                                                removeCarrier(carrier.carrierId);
                                            }
                                        }}
                                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                                        title="Remove carrier"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}

                                {/* Plus button - show only on the last item */}
                                {isLastItem && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            // Add a new empty carrier slot
                                            setCarriers([
                                                ...carriers.filter(c => c.carrierId.trim()),
                                                { name: '', carrierId: '', carrierCode: '', isEnabled: true }
                                            ]);
                                        }}
                                        className="rounded-lg p-2 bg-primary/10 text-primary hover:bg-primary/20 transition"
                                        title="Add another carrier"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Discovered Carriers Quick Add */}
                {discoveredCarriers.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-sm text-slate-600 mb-2">
                            Quick add from discovered carriers:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {discoveredCarriers.map((carrier) => {
                                const alreadyAdded = carriers.some((c) => c.carrierId === carrier.carrierId);
                                return (
                                    <button
                                        key={carrier.carrierId}
                                        type="button"
                                        onClick={() => addDiscoveredCarrier(carrier)}
                                        disabled={alreadyAdded}
                                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${alreadyAdded
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                            }`}
                                    >
                                        {alreadyAdded ? '✓' : '+'} {carrier.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>


            {/* Ship From Address */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Ship From Address (Warehouse)</h3>
                <p className="text-sm text-slate-600 mb-4">
                    This address will be used as the origin for all shipping labels.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                        <input
                            type="text"
                            value={shipFromAddress.name || ''}
                            onChange={(e) => setShipFromAddress({ ...shipFromAddress, name: e.target.value })}
                            placeholder="Contact Name"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                        <input
                            type="text"
                            value={shipFromAddress.companyName || ''}
                            onChange={(e) => setShipFromAddress({ ...shipFromAddress, companyName: e.target.value })}
                            placeholder="Company Name"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                        <input
                            type="text"
                            value={shipFromAddress.phone || ''}
                            onChange={(e) => setShipFromAddress({ ...shipFromAddress, phone: e.target.value })}
                            placeholder="Phone Number"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 1</label>
                        <input
                            type="text"
                            value={shipFromAddress.addressLine1 || ''}
                            onChange={(e) => setShipFromAddress({ ...shipFromAddress, addressLine1: e.target.value })}
                            placeholder="Street Address"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 2</label>
                        <input
                            type="text"
                            value={shipFromAddress.addressLine2 || ''}
                            onChange={(e) => setShipFromAddress({ ...shipFromAddress, addressLine2: e.target.value })}
                            placeholder="Apt, Suite, etc. (optional)"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                        <input
                            type="text"
                            value={shipFromAddress.city || ''}
                            onChange={(e) => setShipFromAddress({ ...shipFromAddress, city: e.target.value })}
                            placeholder="City"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">State/Province</label>
                        <input
                            type="text"
                            value={shipFromAddress.state || ''}
                            onChange={(e) => setShipFromAddress({ ...shipFromAddress, state: e.target.value })}
                            placeholder="State"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Postal Code</label>
                        <input
                            type="text"
                            value={shipFromAddress.postalCode || ''}
                            onChange={(e) => setShipFromAddress({ ...shipFromAddress, postalCode: e.target.value })}
                            placeholder="ZIP/Postal Code"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                        <input
                            type="text"
                            value={shipFromAddress.country || ''}
                            onChange={(e) => setShipFromAddress({ ...shipFromAddress, country: e.target.value })}
                            placeholder="Country Code (e.g., US)"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </motion.div>
    );
}
