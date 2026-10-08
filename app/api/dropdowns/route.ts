import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Dropdown from '@/models/Dropdown';
import { indianStateDropdowns } from '@/lib/indiaStates';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const REASON_FOR_NOT_SWITCHING = [
  { label: 'Price', value: 'price', order: 1 },
  { label: 'Existing Contract', value: 'existing-contract', order: 2 },
  { label: 'Brand Loyalty', value: 'brand-loyalty', order: 3 },
  { label: 'Quality Concerns', value: 'quality-concerns', order: 4 },
  { label: 'Training & Support', value: 'training-support', order: 5 },
  { label: 'Relationship with Provider', value: 'relationship', order: 6 },
  { label: 'Other', value: 'other', order: 7 },
];

const DEFAULT_CITIES = [
  { label: 'Delhi', value: 'delhi', order: 1 },
  { label: 'Mumbai', value: 'mumbai', order: 2 },
  { label: 'Bangalore', value: 'bangalore', order: 3 },
  { label: 'Hyderabad', value: 'hyderabad', order: 4 },
  { label: 'Chennai', value: 'chennai', order: 5 },
  { label: 'Kolkata', value: 'kolkata', order: 6 },
  { label: 'Pune', value: 'pune', order: 7 },
  { label: 'Ahmedabad', value: 'ahmedabad', order: 8 },
];

async function ensureCityOptions() {
  const count = await Dropdown.countDocuments({ group: 'city' });
  if (count > 0) return;
  await Dropdown.insertMany(
    DEFAULT_CITIES.map((item) => ({
      group: 'city',
      ...item,
      isSystem: false,
      isActive: true,
    }))
  );
}

async function ensureStateOptions() {
  const count = await Dropdown.countDocuments({ group: 'state' });
  if (count > 0) return;
  await Dropdown.insertMany(
    indianStateDropdowns().map((item) => ({
      ...item,
      isSystem: false,
      isActive: true,
    }))
  );
}

async function ensureReasonForNotSwitchingOptions() {
  const count = await Dropdown.countDocuments({ group: 'reasonForNotSwitching' });
  if (count > 0) return;
  await Dropdown.insertMany(
    REASON_FOR_NOT_SWITCHING.map((item) => ({
      group: 'reasonForNotSwitching',
      ...item,
      isSystem: false,
      isActive: true,
    }))
  );
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureReasonForNotSwitchingOptions();
    await ensureCityOptions();
    await ensureStateOptions();

    const { searchParams } = new URL(request.url);
    const group = searchParams.get('group') || '';

    const query: Record<string, unknown> = { isActive: true };
    if (group) query.group = group;

    const dropdowns = await Dropdown.find(query).sort({ group: 1, order: 1 }).lean();

    // Group by group name
    const grouped: Record<string, typeof dropdowns> = {};
    for (const d of dropdowns) {
      if (!grouped[d.group]) grouped[d.group] = [];
      grouped[d.group].push(d);
    }

    return Response.json({ data: dropdowns, grouped });
  } catch (error) {
    console.error('GET /api/dropdowns error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    const existing = await Dropdown.findOne({ group: body.group, value: body.value });
    if (existing) {
      return Response.json({ error: 'Option already exists in this group' }, { status: 409 });
    }

    const dropdown = await Dropdown.create(body);
    return Response.json({ data: dropdown }, { status: 201 });
  } catch (error) {
    console.error('POST /api/dropdowns error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, label, value } = body;
    const nextLabel = String(label || '').trim();
    const nextValue = String(value || '').trim();
    if (!nextLabel || !nextValue) {
      return Response.json({ error: 'Label and value are required' }, { status: 400 });
    }

    const dropdown = await Dropdown.findById(id);
    if (!dropdown) return Response.json({ error: 'Dropdown not found' }, { status: 404 });
    if (dropdown.isSystem) {
      return Response.json({ error: 'System dropdowns cannot be modified' }, { status: 403 });
    }

    const duplicate = await Dropdown.findOne({
      group: dropdown.group,
      value: nextValue,
      _id: { $ne: dropdown._id },
    });
    if (duplicate) {
      return Response.json({ error: 'Option already exists in this group' }, { status: 409 });
    }

    dropdown.label = nextLabel;
    dropdown.value = nextValue;
    await dropdown.save();
    return Response.json({ data: dropdown });
  } catch (error) {
    console.error('PUT /api/dropdowns error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return Response.json({ error: 'ID required' }, { status: 400 });

    const dropdown = await Dropdown.findById(id);
    if (!dropdown) return Response.json({ error: 'Not found' }, { status: 404 });
    if (dropdown.isSystem) {
      return Response.json({ error: 'System dropdowns cannot be deleted' }, { status: 403 });
    }

    await dropdown.deleteOne();
    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/dropdowns error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
