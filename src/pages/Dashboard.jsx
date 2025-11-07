import { Grid, Paper, Typography } from "@mui/material";
import { ReceiptLong, Pending, MonetizationOn, Payment } from "@mui/icons-material";


function StatCard({ label, value, color, icon }) {
    return (
      <Paper
        elevation={3}
        sx={{
          p: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h4" sx={{ color }}>
            {value}
          </Typography>
        </div>
        <div style={{ fontSize: 40, color: color || "gray" }}>
          {icon}
        </div>
      </Paper>
    );
  }
  
  export default function Dashboard() {
    return (
      <Grid container spacing={3} direction="column">
        <Grid item xs={12} md={3}>
          <StatCard label="Total Transactions" value="3" color="darkblue" icon={<ReceiptLong />} />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard label="Pending Amount" value="₹70,600" color="orange" icon={<Pending />} />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard label="Total Profit" value="₹1,660" color="green" icon={<MonetizationOn />} />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard label="Total Payments" value="₹2,31,000" color="purple" icon={<Payment />} />
        </Grid>
      </Grid>
    );
  }
  
  
  