import { connectDB } from '@/lib/db';
import { getAuthUser, canWrite } from '@/lib/auth';
import Dropdown from '@/models/Dropdown';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

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
    if (!canWrite(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

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
    if (!canWrite(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { id, ...updates } = body;

    const dropdown = await Dropdown.findById(id);
    if (!dropdown) return Response.json({ error: 'Dropdown not found' }, { status: 404 });
    if (dropdown.isSystem) {
      return Response.json({ error: 'System dropdowns cannot be modified' }, { status: 403 });
    }

    Object.assign(dropdown, updates);
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
    if (!canWrite(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

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
