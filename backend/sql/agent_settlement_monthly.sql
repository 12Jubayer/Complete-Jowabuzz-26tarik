UPDATE agent_commission_settings
SET settlement_type = 'monthly',
    settlement_day = CASE WHEN settlement_day BETWEEN 1 AND 31 THEN settlement_day ELSE 3 END;
