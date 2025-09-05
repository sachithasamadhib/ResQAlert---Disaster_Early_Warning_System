package com.example.mad_day3.Controller

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.mad_day3.Controller.landSlideAdapter.LandSlideCardViewHolder
import com.example.mad_day3.R

data class rainfallItem(
   val altitude: Double,
   val preasure: Double,
   val temp: Double
)
class rainfallAdapter(private val items: List<rainfallItem>) : RecyclerView.Adapter<rainfallAdapter.RainfallCardViewHolder>() {
    class RainfallCardViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView){
        val altitude: TextView = itemView.findViewById(R.id.altitudeAmu)
        val preasure: TextView = itemView.findViewById(R.id.preasureAmu)
        val temp: TextView = itemView.findViewById(R.id.tempAmu)
    }
    override fun onCreateViewHolder(
        parent: ViewGroup,
        viewType: Int
    ): RainfallCardViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.rainfallcard, parent, false)
        return RainfallCardViewHolder(view)
    }

    override fun onBindViewHolder(
        holder: RainfallCardViewHolder,
        position: Int
    ) {
        val item = items[position]
        holder.altitude.text = "${item.altitude}m"
        holder.preasure.text = "${item.preasure}hpa"
        holder.temp.text = "${item.temp}°C"
    }

    override fun getItemCount(): Int {
        return items.size
    }
}
