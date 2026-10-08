import { connectDB } from '@/lib/db';
import { generateUniqueSlug } from '@/lib/utils';
import User from '@/models/User';
import Doctor from '@/models/Doctor';
import Visit from '@/models/Visit';
import Dropdown from '@/models/Dropdown';
import AuditLog from '@/models/AuditLog';
import { indianStateDropdowns } from '@/lib/indiaStates';
import bcrypt from 'bcryptjs';
import { subDays, subHours, addDays } from 'date-fns';

export async function POST() {
  try {
    await connectDB();

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Doctor.deleteMany({}),
      Visit.deleteMany({}),
      Dropdown.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    const hash = (p: string) => bcrypt.hash(p, 12);

    // ── USERS ──────────────────────────────────────────────────
    const [superAdminHash, adminHash, spHash] = await Promise.all([
      hash('SuperAdmin@123'),
      hash('Admin@123'),
      hash('Sales@123'),
    ]);

    const users = await User.insertMany([
      {
        name: 'Rahul Gupta',
        email: 'superadmin@dsrcms.com',
        passwordHash: superAdminHash,
        role: 'superAdmin',
        hasWriteAccess: true,
        status: 'active',
        slug: 'rahul-gupta',
      },
      {
        name: 'Priya Sharma',
        email: 'admin1@dsrcms.com',
        passwordHash: adminHash,
        role: 'admin',
        hasWriteAccess: true,
        status: 'active',
        slug: 'priya-sharma',
      },
      {
        name: 'Amit Verma',
        email: 'admin2@dsrcms.com',
        passwordHash: adminHash,
        role: 'admin',
        hasWriteAccess: false,
        status: 'active',
        slug: 'amit-verma',
      },
      {
        name: 'Sunita Patel',
        email: 'sp1@dsrcms.com',
        passwordHash: spHash,
        role: 'salesPerson',
        hasWriteAccess: false,
        status: 'active',
        slug: 'sunita-patel',
      },
      {
        name: 'Karan Mehta',
        email: 'sp2@dsrcms.com',
        passwordHash: spHash,
        role: 'salesPerson',
        hasWriteAccess: false,
        status: 'active',
        slug: 'karan-mehta',
      },
      {
        name: 'Deepa Nair',
        email: 'sp3@dsrcms.com',
        passwordHash: spHash,
        role: 'salesPerson',
        hasWriteAccess: false,
        status: 'active',
        slug: 'deepa-nair',
      },
    ]);

    const [superAdmin, , , sp1, sp2, sp3] = users;

    // ── DROPDOWNS ──────────────────────────────────────────────
    await Dropdown.insertMany([
      // Visit Types
      { group: 'visitType', label: 'First Meeting', value: 'first-meeting', order: 1, isSystem: false },
      { group: 'visitType', label: 'Follow Up', value: 'follow-up', order: 2, isSystem: false },
      { group: 'visitType', label: 'Product Demo', value: 'product-demo', order: 3, isSystem: false },
      { group: 'visitType', label: 'CME', value: 'cme', order: 4, isSystem: false },
      { group: 'visitType', label: 'Conference', value: 'conference', order: 5, isSystem: false },

      // Specialities
      { group: 'speciality', label: 'Orthodontist', value: 'orthodontist', order: 1 },
      { group: 'speciality', label: 'General Dentist', value: 'general-dentist', order: 2 },
      { group: 'speciality', label: 'Pediatric Dentist', value: 'pediatric-dentist', order: 3 },
      { group: 'speciality', label: 'Others', value: 'others', order: 4 },

      // Doctor Categories
      { group: 'doctorCategory', label: 'Category A (High Value)', value: 'A', order: 1, isSystem: false },
      { group: 'doctorCategory', label: 'Category B (Medium Value)', value: 'B', order: 2, isSystem: false },
      { group: 'doctorCategory', label: 'Category C (Low Value)', value: 'C', order: 3, isSystem: false },
      { group: 'doctorCategory', label: 'Category D (Dormant)', value: 'D', order: 4, isSystem: false },

      // Doctor Status
      { group: 'doctorStatus', label: 'Active', value: 'Active', order: 1, isSystem: false },
      { group: 'doctorStatus', label: 'Prospect', value: 'Prospect', order: 2, isSystem: false },
      { group: 'doctorStatus', label: 'Dormant', value: 'Dormant', order: 3, isSystem: false },
      { group: 'doctorStatus', label: 'Lost', value: 'Lost', order: 4, isSystem: false },

      // Yes/No — System dropdowns (locked)
      { group: 'yesNo', label: 'Yes', value: 'yes', order: 1, isSystem: true },
      { group: 'yesNo', label: 'No', value: 'no', order: 2, isSystem: true },

      // Patient Volume
      { group: 'patientVolume', label: 'High (>100/day)', value: 'high', order: 1 },
      { group: 'patientVolume', label: 'Medium (50-100/day)', value: 'medium', order: 2 },
      { group: 'patientVolume', label: 'Low (<50/day)', value: 'low', order: 3 },

      // Current Aligner Brands
      { group: 'currentAlignerBrand', label: 'Invisalign', value: 'Invisalign', order: 1 },
      { group: 'currentAlignerBrand', label: 'ClearCorrect', value: 'ClearCorrect', order: 2 },
      { group: 'currentAlignerBrand', label: 'Spark', value: 'Spark', order: 3 },
      { group: 'currentAlignerBrand', label: 'Illusion', value: 'Illusion', order: 4 },
      { group: 'currentAlignerBrand', label: 'Toothsi', value: 'Toothsi', order: 5 },

      // Other Ortho Systems
      { group: 'otherOrthoSystem', label: 'Damon', value: 'Damon', order: 1 },
      { group: 'otherOrthoSystem', label: 'Incognito', value: 'Incognito', order: 2 },
      { group: 'otherOrthoSystem', label: 'Traditional Metal', value: 'Traditional Metal', order: 3 },
      { group: 'otherOrthoSystem', label: 'Ceramic', value: 'Ceramic', order: 4 },

      // Decision Maker
      { group: 'decisionMaker', label: 'Doctor', value: 'Doctor', order: 1 },
      { group: 'decisionMaker', label: 'Clinic Owner', value: 'Clinic Owner', order: 2 },
      { group: 'decisionMaker', label: 'Manager', value: 'Manager', order: 3 },

      // Potential Rating
      { group: 'potentialRating', label: 'High', value: 'High', order: 1 },
      { group: 'potentialRating', label: 'Medium', value: 'Medium', order: 2 },
      { group: 'potentialRating', label: 'Low', value: 'Low', order: 3 },

      // Decision Stage
      { group: 'decisionStage', label: 'Lead', value: 'Lead', order: 1 },
      { group: 'decisionStage', label: 'Qualified', value: 'Qualified', order: 2 },
      { group: 'decisionStage', label: 'Proposal', value: 'Proposal', order: 3 },
      { group: 'decisionStage', label: 'Trial Case', value: 'Trial Case', order: 4 },
      { group: 'decisionStage', label: 'Active', value: 'Active', order: 5 },
      { group: 'decisionStage', label: 'Lost', value: 'Lost', order: 6 },

      // Preferred Communication
      { group: 'preferredCommunication', label: 'Call', value: 'Call', order: 1 },
      { group: 'preferredCommunication', label: 'WhatsApp', value: 'WhatsApp', order: 2 },
      { group: 'preferredCommunication', label: 'Email', value: 'Email', order: 3 },

      { group: 'reasonForNotSwitching', label: 'Price', value: 'price', order: 1 },
      { group: 'reasonForNotSwitching', label: 'Existing Contract', value: 'existing-contract', order: 2 },
      { group: 'reasonForNotSwitching', label: 'Brand Loyalty', value: 'brand-loyalty', order: 3 },
      { group: 'reasonForNotSwitching', label: 'Quality Concerns', value: 'quality-concerns', order: 4 },
      { group: 'reasonForNotSwitching', label: 'Training & Support', value: 'training-support', order: 5 },
      { group: 'reasonForNotSwitching', label: 'Relationship with Provider', value: 'relationship', order: 6 },
      { group: 'reasonForNotSwitching', label: 'Other', value: 'other', order: 7 },

      { group: 'city', label: 'Delhi', value: 'delhi', order: 1 },
      { group: 'city', label: 'Mumbai', value: 'mumbai', order: 2 },
      { group: 'city', label: 'Bangalore', value: 'bangalore', order: 3 },
      { group: 'city', label: 'Hyderabad', value: 'hyderabad', order: 4 },
      { group: 'city', label: 'Chennai', value: 'chennai', order: 5 },
      { group: 'city', label: 'Kolkata', value: 'kolkata', order: 6 },
      { group: 'city', label: 'Pune', value: 'pune', order: 7 },
      { group: 'city', label: 'Ahmedabad', value: 'ahmedabad', order: 8 },

      ...indianStateDropdowns(),
    ]);

    // ── DOCTORS ────────────────────────────────────────────────
    const doctorData = [
      {
        name: 'Dr. Ravi Mehta', speciality: 'orthodontist', category: 'A',
        status: 'Active', city: 'Mumbai', area: 'West Mumbai', state: 'Maharashtra',
        phone: '9876543210', email: 'ravi.mehta@clinic.com',
        assignedRep: sp1._id, clinicName: 'Smile Care Clinic',
        clinicAddress: 'Bandra West, Mumbai', 
        currentAlignerBrands: ['Invisalign', 'ClearCorrect'],
        monthlyAlignerCases: 15,
        decisionMaker: 'Doctor',
        probabilityOfConversion: 80,
        currentBrand: 'Invisalign', currentPricing: 80000,
        decisionStage: 'Active',
      },
      {
        name: 'Dr. Anjali Singh', speciality: 'general-dentist', category: 'B',
        status: 'Prospect', city: 'Delhi', area: 'South Delhi', state: 'Delhi',
        phone: '9876543211', email: 'anjali@dental.com', assignedRep: sp1._id,
        clinicName: 'Delhi Dental Centre', clinicAddress: 'South Extension',
        monthlyAlignerCases: 2,
        decisionMaker: 'Clinic Owner',
        probabilityOfConversion: 50,
        decisionStage: 'Lead',
      },
      {
        name: 'Dr. Suresh Kumar', speciality: 'pediatric-dentist', category: 'C',
        status: 'Lost', city: 'Bangalore', area: 'East Bangalore', state: 'Karnataka',
        phone: '9876543212', email: 'suresh@kidsdental.com', assignedRep: sp1._id,
        clinicName: 'Kids Dental Hub', clinicAddress: 'Indiranagar',
        currentBrand: '3M',
        reasonForNotSwitching: 'Price',
        reasonForNotSwitchingDetails: 'Price too high compared to our offer',
        decisionStage: 'Lost',
      },
      {
        name: 'Dr. Meena Reddy', speciality: 'orthodontist', category: 'A',
        status: 'Active', city: 'Hyderabad', area: 'West Hyderabad', state: 'Telangana',
        phone: '9876543213', email: 'meena@ortho.com', assignedRep: sp2._id,
        clinicName: 'Perfect Smiles', clinicAddress: 'Jubilee Hills',
        currentAlignerBrands: ['Invisalign'], monthlyAlignerCases: 20,
        expectedMonthlyCaseVolume: 5, estimatedMonthlyRevenuePotential: 250000,
        decisionStage: 'Active',
      },
      {
        name: 'Dr. Prakash Iyer', speciality: 'general-dentist', category: 'B',
        status: 'Prospect', city: 'Chennai', area: 'Central Chennai', state: 'Tamil Nadu',
        phone: '9876543214', email: 'prakash@chennaidental.com', assignedRep: sp2._id,
        clinicName: 'Chennai Dental', clinicAddress: 'T Nagar',
        decisionMaker: 'Manager', probabilityOfConversion: 30,
        decisionStage: 'Qualified',
      },
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doctors: any[] = [];
    for (const d of doctorData) {
      const slug = await generateUniqueSlug(
        `${d.name}-${d.speciality}-${d.city}`,
        async (s) => !!(await Doctor.findOne({ slug: s })) || doctors.some((doc) => doc.slug === s)
      );
      doctors.push({ ...d, slug, previousSlugs: [] });
    }
    const createdDoctors = await Doctor.insertMany(doctors);

    // ── VISITS ─────────────────────────────────────────────────
    const visitTypes = ['first-meeting', 'follow-up', 'product-demo', 'cme'];
    const statuses: Array<'Completed' | 'Pending' | 'Overdue'> = ['Completed', 'Completed', 'Completed', 'Pending', 'Overdue'];

    const sampleSummary = (doctorName: string, visitType: string) =>
      `This visit with ${doctorName} was conducted as a ${visitType} interaction. The doctor showed significant interest in our portfolio of pharmaceutical products. We discussed the clinical evidence supporting our key brands and their efficacy profiles. The doctor raised concerns about side effects which were addressed with recent clinical trial data. Product samples were provided as requested. The conversation covered patient demographics and prescription habits, with the doctor indicating a willingness to consider our products for appropriate patient profiles. Follow-up materials were shared digitally. Overall this was a productive meeting with good engagement from the doctor's end. We discussed competitive landscape and our differentiators in terms of pricing and clinical outcomes. The clinic staff was also briefed about our medical helpline.`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const visits: any[] = [];
    for (let i = 0; i < 30; i++) {
      const doctor = createdDoctors[i % createdDoctors.length];
      const sp = [sp1, sp2, sp3][i % 3];
      const daysAgo = Math.floor(Math.random() * 60);
      const visitDate = subDays(new Date(), daysAgo);
      const visitType = visitTypes[i % visitTypes.length];
      const status = statuses[i % statuses.length];

      const slugBase = `${visitDate.toISOString().split('T')[0]}-${doctor.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${visitType}`;
      let slug = slugBase.replace(/-+/g, '-').slice(0, 80);
      let counter = 2;
      while (visits.some((v) => v.slug === slug)) {
        slug = `${slugBase}-${counter}`.slice(0, 80);
        counter++;
      }

      const visit: Record<string, unknown> = {
        slug,
        doctor: doctor._id,
        salesPerson: sp._id,
        visitDate,
        visitType,
        meetingSummary: sampleSummary(doctor.name, visitType) + ` Visit #${i + 1} additional notes and observations from the field.`,
        productsDiscussed: 'CardioPlus 10mg, NeuroShield 500mg',
        samplesGiven: i % 3 === 0 ? '2 strips of CardioPlus 10mg' : undefined,
        status,
        nextSteps: 'Follow up in 2 weeks with updated clinical data',
      };

      if (status === 'Pending' || status === 'Overdue') {
        visit.followUpDate = status === 'Overdue' ? subHours(new Date(), 48) : addDays(new Date(), 7);
        visit.followUpNotes = 'Bring updated pricing sheet and new trial data';
      }

      visits.push(visit);
    }

    await Visit.insertMany(visits);

    // ── AUDIT LOG SEED ─────────────────────────────────────────
    await AuditLog.create({
      actor: superAdmin._id,
      actorName: superAdmin.name,
      actorRole: 'superAdmin',
      action: 'CREATE',
      entity: 'System',
      entityId: 'seed',
      entityLabel: 'Sample data seeded',
    });

    return Response.json({
      success: true,
      message: 'Sample data seeded successfully',
      counts: {
        users: users.length,
        doctors: createdDoctors.length,
        visits: visits.length,
        dropdowns: 26,
      },
      credentials: [
        { role: 'Super Admin', email: 'superadmin@dsrcms.com', password: 'SuperAdmin@123' },
        { role: 'Admin (Write)', email: 'admin1@dsrcms.com', password: 'Admin@123' },
        { role: 'Admin (Read Only)', email: 'admin2@dsrcms.com', password: 'Admin@123' },
        { role: 'Sales Person 1', email: 'sp1@dsrcms.com', password: 'Sales@123' },
        { role: 'Sales Person 2', email: 'sp2@dsrcms.com', password: 'Sales@123' },
        { role: 'Sales Person 3', email: 'sp3@dsrcms.com', password: 'Sales@123' },
      ],
    });
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
