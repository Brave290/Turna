import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.SUPABASE_URL ?? 'http://localhost:54321';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const USERS = [
  { phone: '+2348012345678', display_name: 'Adaeze Okonkwo', avatar_url: null },
  { phone: '+2348023456789', display_name: 'Chinedu Eze', avatar_url: null },
  { phone: '+2348034567890', display_name: 'Fatima Abubakar', avatar_url: null },
  { phone: '+2348045678901', display_name: 'Kunle Adebayo', avatar_url: null },
  { phone: '+2348056789012', display_name: 'Amina Yusuf', avatar_url: null },
  { phone: '+2348067890123', display_name: 'Emeka Nwosu', avatar_url: null },
];

const CIRCLE_NAME = 'Family Savings Circle';
const CONTRIBUTION_AMOUNT = 5000000; // 50,000 NGN in kobo
const MEMBER_LIMIT = 6;

async function seed() {
  console.log('🌱 Starting seed...');

  // 1. Create profiles (users)
  console.log('Creating profiles...');
  const userIds: string[] = [];
  
  for (const user of USERS) {
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      phone: user.phone,
      phone_confirm: true,
      user_metadata: { display_name: user.display_name },
    });

    if (authError) {
      console.error(`Failed to create auth user for ${user.phone}:`, authError.message);
      continue;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        phone: user.phone,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      });

    if (profileError) {
      console.error(`Failed to create profile for ${user.phone}:`, profileError.message);
    } else {
      userIds.push(authUser.user.id);
      console.log(`✓ Created user: ${user.display_name} (${user.phone})`);
    }
  }

  if (userIds.length < 2) {
    console.error('Need at least 2 users');
    process.exit(1);
  }

  // 2. Create circle
  console.log('Creating circle...');
  const ownerId = userIds[0];
  
  const { data: circle, error: circleError } = await supabase
    .from('circles')
    .insert({
      name: CIRCLE_NAME,
      description: 'Monthly family savings circle for household expenses',
      owner_id: ownerId,
      contribution_amount: CONTRIBUTION_AMOUNT,
      currency: 'NGN',
      frequency: 'monthly',
      member_limit: MEMBER_LIMIT,
      status: 'active',
      current_cycle: 2,
      start_date: '2024-01-15',
    })
    .select()
    .single();

  if (circleError) {
    console.error('Failed to create circle:', circleError.message);
    process.exit(1);
  }
  console.log(`✓ Created circle: ${circle.name} (${circle.id})`);

  // 3. Add members with payout positions
  console.log('Adding circle members...');
  const memberPositions = [
    { user_id: userIds[0], role: 'owner' as const, position: 1 },
    { user_id: userIds[1], role: 'treasurer' as const, position: 2 },
    { user_id: userIds[2], role: 'member' as const, position: 3 },
    { user_id: userIds[3], role: 'member' as const, position: 4 },
    { user_id: userIds[4], role: 'member' as const, position: 5 },
    { user_id: userIds[5], role: 'member' as const, position: 6 },
  ];

  const memberIds: string[] = [];
  
  for (const mp of memberPositions) {
    const { data: member, error: memberError } = await supabase
      .from('circle_members')
      .insert({
        circle_id: circle.id,
        user_id: mp.user_id,
        role: mp.role,
        payout_position: mp.position,
        status: 'active',
        joined_at: '2024-01-10T10:00:00Z',
      })
      .select()
      .single();

    if (memberError) {
      console.error(`Failed to add member ${mp.user_id}:`, memberError.message);
    } else {
      memberIds.push(member.id);
      console.log(`✓ Added member: ${mp.user_id} (position ${mp.position}, role ${mp.role})`);
    }
  }

  // 4. Create contribution cycles (6 cycles for 6 members)
  console.log('Creating contribution cycles...');
  const cycles = [];
  const startDate = new Date('2024-01-15');
  
  for (let i = 1; i <= 6; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + (i - 1));
    
    const payoutMemberId = memberIds.find((_, idx) => idx === i - 1);
    
    cycles.push({
      circle_id: circle.id,
      cycle_number: i,
      due_date: dueDate.toISOString().split('T')[0],
      payout_member_id: payoutMemberId ?? null,
      expected_amount: CONTRIBUTION_AMOUNT,
      status: i <= 2 ? 'completed' : (i === 3 ? 'collecting' : 'pending'),
      completed_at: i <= 2 ? new Date(dueDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString() : null,
    });
  }

  const { data: createdCycles, error: cyclesError } = await supabase
    .from('contribution_cycles')
    .insert(cycles)
    .select();

  if (cyclesError) {
    console.error('Failed to create cycles:', cyclesError.message);
    process.exit(1);
  }
  console.log(`✓ Created ${createdCycles?.length ?? 0} cycles`);

  // 5. Create contributions for completed cycles (cycles 1 & 2)
  console.log('Creating contributions...');
  if (createdCycles) {
    for (const cycle of createdCycles) {
      if (cycle.status !== 'completed') continue;

      for (const memberId of memberIds) {
        const isPayoutMember = memberId === cycle.payout_member_id;
        
        const { error: contribError } = await supabase
          .from('contributions')
          .insert({
            cycle_id: cycle.id,
            member_id: memberId,
            expected_amount: CONTRIBUTION_AMOUNT,
            reported_amount: CONTRIBUTION_AMOUNT,
            payment_method: 'bank_transfer',
            status: 'confirmed',
            reported_at: new Date(cycle.due_date).toISOString(),
            confirmed_at: new Date(new Date(cycle.due_date).getTime() + 24 * 60 * 60 * 1000).toISOString(),
          });

        if (contribError) {
          console.error(`Failed to create contribution for member ${memberId} in cycle ${cycle.cycle_number}:`, contribError.message);
        }
      }
      
      // Add confirmations (treasurer confirms)
      const treasurerId = memberIds[1]; // Chinedu is treasurer
      const { data: contributions } = await supabase
        .from('contributions')
        .select('id')
        .eq('cycle_id', cycle.id);

      if (contributions) {
        for (const contrib of contributions) {
          // Don't let treasurer confirm their own
          if (contributions.find(c => c.member_id === treasurerId)?.id === contrib.id) continue;
          
          await supabase
            .from('contribution_confirmations')
            .insert({
              contribution_id: contrib.id,
              confirmer_id: treasurerId,
              decision: 'approved',
              note: 'Verified via bank transfer receipt',
            });
        }
      }
      console.log(`✓ Created contributions for cycle ${cycle.cycle_number}`);
    }
  }

  // 6. Create payouts for completed cycles
  console.log('Creating payouts...');
  if (createdCycles) {
    for (const cycle of createdCycles) {
      if (cycle.status !== 'completed' || !cycle.payout_member_id) continue;

      const { error: payoutError } = await supabase
        .from('payouts')
        .insert({
          cycle_id: cycle.id,
          recipient_member_id: cycle.payout_member_id,
          expected_amount: CONTRIBUTION_AMOUNT,
          actual_amount: CONTRIBUTION_AMOUNT,
          status: 'received',
          initiated_at: new Date(new Date(cycle.due_date).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          confirmed_at: new Date(new Date(cycle.due_date).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          confirmed_by: cycle.payout_member_id,
          notes: 'Received via bank transfer',
        });

      if (payoutError) {
        console.error(`Failed to create payout for cycle ${cycle.cycle_number}:`, payoutError.message);
      } else {
        // Add payout confirmation
        const { data: payout } = await supabase
          .from('payouts')
          .select('id')
          .eq('cycle_id', cycle.id)
          .single();

        if (payout) {
          await supabase
            .from('payout_confirmations')
            .insert({
              payout_id: payout.id,
              confirmer_id: cycle.payout_member_id,
              decision: 'approved',
              note: 'Confirmed receipt',
            });
        }
        console.log(`✓ Created payout for cycle ${cycle.cycle_number}`);
      }
    }
  }

  // 7. Create ledger events
  console.log('Creating ledger events...');
  
  // Circle created
  await supabase.from('ledger_events').insert({
    circle_id: circle.id,
    actor_id: ownerId,
    event_type: 'CIRCLE_CREATED',
    entity_type: 'circle',
    entity_id: circle.id,
    payload: { name: circle.name, contribution_amount: CONTRIBUTION_AMOUNT },
  });

  // Member joined events
  for (let i = 0; i < memberIds.length; i++) {
    await supabase.from('ledger_events').insert({
      circle_id: circle.id,
      actor_id: ownerId,
      event_type: 'MEMBER_JOINED',
      entity_type: 'circle_member',
      entity_id: memberIds[i],
      payload: { payout_position: i + 1, role: memberPositions[i].role },
    });
  }

  // Payout order set
  await supabase.from('ledger_events').insert({
    circle_id: circle.id,
    actor_id: ownerId,
    event_type: 'PAYOUT_ORDER_SET',
    entity_type: 'circle',
    entity_id: circle.id,
    payload: { positions: memberPositions.map(mp => ({ member_id: memberIds[mp.position - 1], position: mp.position })) },
  });

  // Cycle started events
  if (createdCycles) {
    for (const cycle of createdCycles) {
      await supabase.from('ledger_events').insert({
        circle_id: circle.id,
        actor_id: ownerId,
        event_type: 'CYCLE_STARTED',
        entity_type: 'contribution_cycle',
        entity_id: cycle.id,
        payload: { cycle_number: cycle.cycle_number },
      });

      if (cycle.status === 'completed') {
        await supabase.from('ledger_events').insert({
          circle_id: circle.id,
          actor_id: ownerId,
          event_type: 'CYCLE_COMPLETED',
          entity_type: 'contribution_cycle',
          entity_id: cycle.id,
          payload: { cycle_number: cycle.cycle_number },
        });
      }
    }
  }

  console.log('✓ Created ledger events');

  // 8. Create some notifications
  console.log('Creating notifications...');
  for (const userId of userIds) {
    await supabase.from('notifications').insert({
      user_id: userId,
      circle_id: circle.id,
      channel: 'in_app',
      title: 'Welcome to Turna!',
      body: 'Your family savings circle is ready. First cycle starts soon.',
      data: { circle_id: circle.id },
      status: 'read',
      read_at: new Date().toISOString(),
    });
  }
  console.log('✓ Created notifications');

  // 9. Create contributions for current cycle (cycle 3 - collecting)
  console.log('Creating contributions for current cycle...');
  const currentCycle = createdCycles?.find(c => c.cycle_number === 3);
  if (currentCycle) {
    // Some members have reported, some confirmed, some pending
    const statuses = ['confirmed', 'confirmed', 'reported', 'pending', 'pending', 'pending'];
    
    for (let i = 0; i < memberIds.length; i++) {
      const status = statuses[i];
      const reportedAmount = status !== 'pending' ? CONTRIBUTION_AMOUNT : null;
      const reportedAt = status !== 'pending' ? new Date(currentCycle.due_date).toISOString() : null;
      const confirmedAt = status === 'confirmed' ? new Date(new Date(currentCycle.due_date).getTime() + 12 * 60 * 60 * 1000).toISOString() : null;

      const { data: contrib } = await supabase
        .from('contributions')
        .insert({
          cycle_id: currentCycle.id,
          member_id: memberIds[i],
          expected_amount: CONTRIBUTION_AMOUNT,
          reported_amount: reportedAmount,
          payment_method: status !== 'pending' ? 'bank_transfer' : null,
          status,
          reported_at: reportedAt,
          confirmed_at: confirmedAt,
        })
        .select()
        .single();

      if (contrib && status === 'confirmed') {
        await supabase
          .from('contribution_confirmations')
          .insert({
            contribution_id: contrib.id,
            confirmer_id: memberIds[1], // treasurer
            decision: 'approved',
            note: 'Verified',
          });
      }
    }
    console.log('✓ Created contributions for current cycle');
  }

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   Circle: ${circle.name} (${circle.id})`);
  console.log(`   Members: ${memberIds.length}`);
  console.log(`   Cycles: ${createdCycles?.length ?? 0}`);
  console.log(`   Status: Cycle 1 & 2 completed, Cycle 3 collecting, Cycles 4-6 pending`);
  console.log('\n🔑 Test accounts:');
  USERS.forEach(u => console.log(`   ${u.phone} (${u.display_name})`));
}

seed().catch(console.error);