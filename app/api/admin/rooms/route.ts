import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // This is a simple in-memory storage for rooms
    // In a real application, you might want to use a database
    const defaultRooms = [
      { id: 'room-101', name: 'Room 101', floor: 1, building: 'Main Building', description: 'Computer Lab' },
      { id: 'room-102', name: 'Room 102', floor: 1, building: 'Main Building', description: 'Classroom' },
      { id: 'room-201', name: 'Room 201', floor: 2, building: 'Main Building', description: 'Conference Room' },
      { id: 'room-202', name: 'Room 202', floor: 2, building: 'Main Building', description: 'Study Hall' },
      { id: 'room-301', name: 'Room 301', floor: 3, building: 'Main Building', description: 'Library' },
      { id: 'lab-a1', name: 'Lab A1', floor: 1, building: 'Science Building', description: 'Chemistry Lab' },
      { id: 'lab-b1', name: 'Lab B1', floor: 1, building: 'Science Building', description: 'Physics Lab' },
      { id: 'auditorium', name: 'Auditorium', floor: 1, building: 'Main Building', description: 'Main Auditorium' },
      { id: 'cafeteria', name: 'Cafeteria', floor: 1, building: 'Student Center', description: 'Dining Area' },
      { id: 'gym', name: 'Gymnasium', floor: 1, building: 'Sports Complex', description: 'Main Gym' }
    ];

    return NextResponse.json({ success: true, rooms: defaultRooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, building, floor, description } = body;

    // Validate required fields
    if (!name || !building || !floor) {
      return NextResponse.json(
        { success: false, error: 'Name, building, and floor are required' },
        { status: 400 }
      );
    }

    // In a real application, you would save this to a database
    const newRoom = {
      id: `room-${Date.now()}`,
      name: name.trim(),
      building: building.trim(),
      floor: parseInt(floor),
      description: description?.trim() || undefined
    };

    // For now, just return the created room
    return NextResponse.json({ success: true, room: newRoom });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create room' },
      { status: 500 }
    );
  }
}