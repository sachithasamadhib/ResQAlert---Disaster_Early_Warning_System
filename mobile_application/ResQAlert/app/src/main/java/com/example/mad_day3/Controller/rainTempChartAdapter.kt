package com.example.mad_day3.Controller

import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.example.mad_day3.R
import com.jjoe64.graphview.GraphView
import com.jjoe64.graphview.series.DataPoint
import com.jjoe64.graphview.series.LineGraphSeries
//class rainTempChartAdapter : RecyclerView.Adapter<rainTempChartAdapter.tempChartViewHolder>() {
//
//    // Add data points as a property
//    private val dataPoints = arrayOf(
//        DataPoint(0.0, 1.0),
//        DataPoint(1.0, 3.0),
//        DataPoint(2.0, 4.0),
//        DataPoint(3.0, 9.0),
//        DataPoint(4.0, 6.0),
//        DataPoint(5.0, 3.0),
//        DataPoint(6.0, 6.0),
//        DataPoint(7.0, 1.0),
//        DataPoint(8.0, 2.0)
//    )
//
//    class tempChartViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
//        val lineGraphView: GraphView = itemView.findViewById(R.id.idGraphView)
//    }
//
//    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): tempChartViewHolder {
//        val view = LayoutInflater.from(parent.context)
//            .inflate(R.layout.temp_chart, parent, false)
//        return tempChartViewHolder(view)
//    }
//
//    override fun onBindViewHolder(holder: tempChartViewHolder, position: Int) {
//        // Clear any existing series
//        holder.lineGraphView.removeAllSeries()
//
//        // Create new series with data points
//        val series = LineGraphSeries(dataPoints)
//
//        // Customize the series
//        series.color = holder.itemView.context.getColor(R.color.red_500)
//        series.isDrawDataPoints = true
//        series.dataPointsRadius = 10f
//        series.thickness = 5
//
//        // Add series to graph
//        holder.lineGraphView.addSeries(series)
//
//        // Configure viewport
//        holder.lineGraphView.viewport.isXAxisBoundsManual = true
//        holder.lineGraphView.viewport.setMinX(0.0)
//        holder.lineGraphView.viewport.setMaxX(8.0)
//
//        holder.lineGraphView.viewport.isYAxisBoundsManual = true
//        holder.lineGraphView.viewport.setMinY(0.0)
//        holder.lineGraphView.viewport.setMaxY(100.0)
//
//        // Make graph scrollable and scalable
//        holder.lineGraphView.viewport.isScrollable = true
//        holder.lineGraphView.viewport.isScalable = true
//
//        // Refresh the graph
//        holder.lineGraphView.onDataChanged(true, true)
//    }
//
//    override fun getItemCount(): Int {
//        return 1
//    }
//}
class rainTempChartAdapter : RecyclerView.Adapter<rainTempChartAdapter.tempChartViewHolder>() {

    // Store temperature data points
    private val temperatureData = mutableListOf<DataPoint>()
    private var maxDataPoints = 20 // Limit number of points to show

    class tempChartViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val lineGraphView: GraphView = itemView.findViewById(R.id.idGraphView)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): tempChartViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.temp_chart, parent, false)
        return tempChartViewHolder(view)
    }

    override fun onBindViewHolder(holder: tempChartViewHolder, position: Int) {
        configureGraphView(holder.lineGraphView)
    }

    // Public method to add new temperature data
    fun addTemperatureData(timestamp: Double, temperature: Double) {
        // Add new data point
        temperatureData.add(DataPoint(timestamp, temperature))

        // Remove oldest data point if we exceed the limit
        if (temperatureData.size > maxDataPoints) {
            temperatureData.removeAt(0)
        }

        // Notify adapter that data has changed
        notifyDataSetChanged()
    }

//    private fun configureGraphView(graphView: GraphView) {
//        try {
//            // Clear any existing series
//            graphView.removeAllSeries()
//
//            if (temperatureData.isNotEmpty()) {
//                // Create new series with current data
//                val series = LineGraphSeries(temperatureData.toTypedArray())
//
//                // Configure series
//                series.color = ContextCompat.getColor(graphView.context, R.color.red_500)
//                series.isDrawDataPoints = true
//                series.dataPointsRadius = 8f
//                series.thickness = 4
//
//                // Add series to graph
//                graphView.addSeries(series)
//
//                // Configure viewport with dynamic bounds
//                val xValues = temperatureData.map { it.x }
//                val yValues = temperatureData.map { it.y }
//
//                val xMin = xValues.minOrNull() ?: 0.0
//                val xMax = xValues.maxOrNull() ?: 10.0
//                val yMin = (yValues.minOrNull() ?: 0.0) - 2.0 // Add some padding
//                val yMax = (yValues.maxOrNull() ?: 10.0) + 2.0 // Add some padding
//
//                graphView.viewport.isXAxisBoundsManual = true
//                graphView.viewport.setMinX(xMin)
//                graphView.viewport.setMaxX(xMax)
//
//                graphView.viewport.isYAxisBoundsManual = true
//                graphView.viewport.setMinY(yMin)
//                graphView.viewport.setMaxY(yMax)
//
//                // Configure grid and labels
//                graphView.gridLabelRenderer.numHorizontalLabels = 5
//                graphView.gridLabelRenderer.numVerticalLabels = 6
//                graphView.gridLabelRenderer.textSize = 24f
//
//                // Refresh the graph
//                graphView.onDataChanged(true, true)
//            }
//        } catch (e: Exception) {
//            Log.e("GraphView", "Error configuring graph: ${e.message}")
//        }
//    }
private fun configureGraphView(graphView: GraphView) {
    try {
        // Clear any existing series
        graphView.removeAllSeries()

        if (temperatureData.isNotEmpty()) {
            // Create new series with current data
            val series = LineGraphSeries(temperatureData.toTypedArray())

            // Configure series
            series.color = ContextCompat.getColor(graphView.context, R.color.red_500)
            series.isDrawDataPoints = true
            series.dataPointsRadius = 8f
            series.thickness = 4

            // Add series to graph
            graphView.addSeries(series)

            // Configure viewport with dynamic bounds
            val xValues = temperatureData.map { it.x }
            val yValues = temperatureData.map { it.y }

            val xMin = xValues.minOrNull() ?: 0.0
            val xMax = xValues.maxOrNull() ?: 10.0
            val yMin = (yValues.minOrNull() ?: 0.0) - 2.0 // Add some padding
            val yMax = (yValues.maxOrNull() ?: 10.0) + 2.0 // Add some padding

            graphView.viewport.isXAxisBoundsManual = true
            graphView.viewport.setMinX(xMin)
            graphView.viewport.setMaxX(xMax)

            graphView.viewport.isYAxisBoundsManual = true
            graphView.viewport.setMinY(yMin)
            graphView.viewport.setMaxY(yMax)

            // Configure grid and labels - HIDE X-AXIS LABELS
            graphView.gridLabelRenderer.isHorizontalLabelsVisible = false // This hides X-axis numbers
            graphView.gridLabelRenderer.numVerticalLabels = 6
            graphView.gridLabelRenderer.textSize = 24f

            // Optional: Hide vertical grid lines if you want a cleaner look
            // graphView.gridLabelRenderer.isVerticalGridVisible = false

            // Optional: Hide horizontal grid lines if you want
            // graphView.gridLabelRenderer.isHorizontalGridVisible = false

            // Refresh the graph
            graphView.onDataChanged(true, true)
        }
    } catch (e: Exception) {
        Log.e("GraphView", "Error configuring graph: ${e.message}")
    }
}

    override fun getItemCount(): Int {
        return 1
    }
}